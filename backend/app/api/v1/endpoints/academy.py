"""
WellKOC — Academy Endpoints (Module #42)
GET    /academy/courses                  List published courses
GET    /academy/courses/{id}             Course detail + lessons
POST   /academy/courses/{id}/enroll      Enroll in a course
GET    /academy/courses/{id}/progress    My progress in a course
PUT    /academy/lessons/{lesson_id}/complete  Mark lesson complete
GET    /academy/my-courses               My enrolled courses
GET    /academy/leaderboard              Top learners leaderboard
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_user, require_role, CurrentUser
from app.models.user import User, UserRole

router = APIRouter(prefix="/academy", tags=["Academy"])


# ── Inline models (use DB tables from migration 0004) ────────────────────────
# We reference tables by name via raw SQL to avoid circular imports while
# the ORM models are being set up.

# ── Schemas ──────────────────────────────────────────────────────────────────

class CourseListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str
    level: str
    target_role: Optional[str] = None
    is_free: bool
    price: float
    xp_reward: int
    duration_minutes: int
    lesson_count: int
    enrollment_count: int
    rating_avg: float


class LessonBrief(BaseModel):
    id: UUID
    title: str
    order_index: int
    type: str
    duration_minutes: int
    is_free_preview: bool
    completed: bool = False


class CourseDetail(CourseListItem):
    lessons: list[LessonBrief] = []


class EnrollResponse(BaseModel):
    enrolled: bool
    enrollment_id: UUID
    course_title: str


class ProgressResponse(BaseModel):
    course_id: UUID
    progress_pct: int
    completed_lessons: int
    total_lessons: int
    completed_at: Optional[datetime] = None
    xp_awarded: bool


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_course(db: AsyncSession, course_id: UUID):
    from sqlalchemy import text
    r = await db.execute(
        text("SELECT * FROM courses WHERE id = :id AND is_published = true"),
        {"id": str(course_id)},
    )
    row = r.mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Khóa học không tồn tại hoặc chưa được công bố")
    return dict(row)


async def _get_enrollment(db: AsyncSession, user_id: UUID, course_id: UUID):
    from sqlalchemy import text
    r = await db.execute(
        text("SELECT * FROM course_enrollments WHERE user_id = :uid AND course_id = :cid"),
        {"uid": str(user_id), "cid": str(course_id)},
    )
    row = r.mappings().one_or_none()
    return dict(row) if row else None


# ── GET /academy/courses ──────────────────────────────────────────────────────

@router.get("/courses")
async def list_courses(
    category: Optional[str] = Query(None),
    level: Optional[str] = Query(None, pattern="^(beginner|intermediate|advanced)$"),
    target_role: Optional[str] = Query(None, pattern="^(buyer|koc|vendor|all)$"),
    is_free: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List all published courses with filters."""
    from sqlalchemy import text

    conditions = ["is_published = true"]
    params: dict = {}

    if category:
        conditions.append("category = :category")
        params["category"] = category
    if level:
        conditions.append("level = :level")
        params["level"] = level
    if target_role:
        conditions.append("(target_role = :role OR target_role = 'all')")
        params["role"] = target_role
    if is_free is not None:
        conditions.append("is_free = :is_free")
        params["is_free"] = is_free
    if search:
        conditions.append("(title ILIKE :search OR description ILIKE :search)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)
    offset = (page - 1) * per_page

    count_r = await db.execute(text(f"SELECT COUNT(*) FROM courses WHERE {where}"), params)
    total = count_r.scalar() or 0

    rows_r = await db.execute(
        text(f"SELECT * FROM courses WHERE {where} ORDER BY enrollment_count DESC, created_at DESC LIMIT :limit OFFSET :offset"),
        {**params, "limit": per_page, "offset": offset},
    )
    courses = [dict(r) for r in rows_r.mappings().all()]

    return {
        "items": courses,
        "total": total,
        "page": page,
        "per_page": per_page,
        "categories": ["koc_skills", "vendor_ops", "web3_basics", "marketing", "finance"],
    }


# ── GET /academy/courses/{id} ─────────────────────────────────────────────────

@router.get("/courses/{course_id}")
async def course_detail(
    course_id: UUID,
    current_user: Optional[User] = Depends(lambda: None),
    db: AsyncSession = Depends(get_db),
):
    """Course detail with lesson list. Free preview lessons visible without auth."""
    from sqlalchemy import text

    course = await _get_course(db, course_id)

    lessons_r = await db.execute(
        text("SELECT * FROM course_lessons WHERE course_id = :cid ORDER BY order_index ASC"),
        {"cid": str(course_id)},
    )
    lessons = [dict(r) for r in lessons_r.mappings().all()]

    return {**course, "lessons": lessons}


# ── POST /academy/courses/{id}/enroll ────────────────────────────────────────

@router.post("/courses/{course_id}/enroll", status_code=201)
async def enroll_course(
    course_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Enroll in a course. Free courses enroll immediately."""
    from sqlalchemy import text
    import uuid

    course = await _get_course(db, course_id)

    # Check already enrolled
    existing = await _get_enrollment(db, current_user.id, course_id)
    if existing:
        return {
            "enrolled": False,
            "enrollment_id": existing["id"],
            "course_title": course["title"],
            "message": "Bạn đã đăng ký khóa học này rồi",
        }

    # For paid courses: check if user has paid (TODO: integrate with payments)
    if not course["is_free"] and float(course["price"]) > 0:
        raise HTTPException(402, "Khóa học trả phí — vui lòng thanh toán trước")

    enrollment_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO course_enrollments (id, course_id, user_id, progress_pct, enrolled_at)
            VALUES (:id, :course_id, :user_id, 0, now())
        """),
        {"id": enrollment_id, "course_id": str(course_id), "user_id": str(current_user.id)},
    )
    # Bump enrollment count
    await db.execute(
        text("UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = :id"),
        {"id": str(course_id)},
    )
    await db.commit()

    return {
        "enrolled": True,
        "enrollment_id": enrollment_id,
        "course_title": course["title"],
    }


# ── GET /academy/courses/{id}/progress ───────────────────────────────────────

@router.get("/courses/{course_id}/progress", response_model=ProgressResponse)
async def course_progress(
    course_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """My progress in a course."""
    from sqlalchemy import text

    enrollment = await _get_enrollment(db, current_user.id, course_id)
    if not enrollment:
        raise HTTPException(404, "Bạn chưa đăng ký khóa học này")

    total_r = await db.execute(
        text("SELECT COUNT(*) FROM course_lessons WHERE course_id = :cid"),
        {"cid": str(course_id)},
    )
    total_lessons = total_r.scalar() or 0

    completed = round((enrollment["progress_pct"] / 100) * total_lessons)

    return ProgressResponse(
        course_id=course_id,
        progress_pct=enrollment["progress_pct"],
        completed_lessons=completed,
        total_lessons=total_lessons,
        completed_at=enrollment.get("completed_at"),
        xp_awarded=enrollment.get("xp_awarded", False),
    )


# ── PUT /academy/lessons/{lesson_id}/complete ────────────────────────────────

@router.put("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mark a lesson as complete. Recalculates course progress."""
    from sqlalchemy import text

    # Get lesson → course_id
    lesson_r = await db.execute(
        text("SELECT * FROM course_lessons WHERE id = :id"),
        {"id": str(lesson_id)},
    )
    lesson = lesson_r.mappings().one_or_none()
    if not lesson:
        raise HTTPException(404, "Bài học không tồn tại")

    course_id = lesson["course_id"]

    # Check enrollment
    enrollment = await _get_enrollment(db, current_user.id, course_id)
    if not enrollment:
        raise HTTPException(403, "Bạn chưa đăng ký khóa học này")

    # Count total lessons + completed lessons
    total_r = await db.execute(
        text("SELECT COUNT(*) FROM course_lessons WHERE course_id = :cid"),
        {"cid": str(course_id)},
    )
    total_lessons = total_r.scalar() or 1

    # Update progress (simple: increment by 1/total per lesson)
    new_progress = min(100, enrollment["progress_pct"] + round(100 / total_lessons))
    completed_at = None
    xp_awarded = enrollment.get("xp_awarded", False)

    # Award XP if just completed (100%)
    if new_progress >= 100 and not xp_awarded:
        completed_at = datetime.now(timezone.utc)
        xp_awarded = True
        # Get course XP reward
        course_r = await db.execute(
            text("SELECT xp_reward, title FROM courses WHERE id = :id"),
            {"id": str(course_id)},
        )
        course_data = course_r.mappings().one_or_none()
        if course_data and course_data["xp_reward"]:
            try:
                from app.services.gamification_service import GamificationService
                svc = GamificationService(db)
                await svc.award_xp(
                    current_user.id,
                    "course_completed",
                    reference_id=str(course_id),
                    custom_amount=course_data["xp_reward"],
                )
            except Exception:
                pass  # Graceful — don't fail lesson completion if XP award fails

    update_params = {
        "progress": new_progress,
        "last_lesson": str(lesson_id),
        "uid": str(current_user.id),
        "cid": str(course_id),
    }
    if completed_at:
        await db.execute(
            text("""
                UPDATE course_enrollments
                SET progress_pct = :progress, last_lesson_id = :last_lesson,
                    completed_at = now(), xp_awarded = true
                WHERE user_id = :uid AND course_id = :cid
            """),
            update_params,
        )
    else:
        await db.execute(
            text("""
                UPDATE course_enrollments
                SET progress_pct = :progress, last_lesson_id = :last_lesson
                WHERE user_id = :uid AND course_id = :cid
            """),
            update_params,
        )
    await db.commit()

    return {
        "lesson_id": str(lesson_id),
        "progress_pct": new_progress,
        "completed": new_progress >= 100,
        "xp_awarded": xp_awarded,
    }


# ── GET /academy/my-courses ───────────────────────────────────────────────────

@router.get("/my-courses")
async def my_courses(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all courses I'm enrolled in with progress."""
    from sqlalchemy import text

    rows_r = await db.execute(
        text("""
            SELECT c.*, e.progress_pct, e.enrolled_at, e.completed_at, e.xp_awarded
            FROM course_enrollments e
            JOIN courses c ON c.id = e.course_id
            WHERE e.user_id = :uid
            ORDER BY e.enrolled_at DESC
        """),
        {"uid": str(current_user.id)},
    )
    courses = [dict(r) for r in rows_r.mappings().all()]
    return {"items": courses, "total": len(courses)}


# ── GET /academy/leaderboard ──────────────────────────────────────────────────

@router.get("/leaderboard")
async def academy_leaderboard(
    limit: int = Query(20, ge=5, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Top learners by number of completed courses."""
    from sqlalchemy import text

    rows_r = await db.execute(
        text("""
            SELECT u.id, u.display_name, u.avatar_url, u.role,
                   COUNT(e.id) FILTER (WHERE e.completed_at IS NOT NULL) AS completed_courses,
                   SUM(c.xp_reward) FILTER (WHERE e.completed_at IS NOT NULL) AS total_xp_earned
            FROM course_enrollments e
            JOIN users u ON u.id = e.user_id
            JOIN courses c ON c.id = e.course_id
            GROUP BY u.id, u.display_name, u.avatar_url, u.role
            HAVING COUNT(e.id) FILTER (WHERE e.completed_at IS NOT NULL) > 0
            ORDER BY completed_courses DESC, total_xp_earned DESC
            LIMIT :limit
        """),
        {"limit": limit},
    )
    entries = []
    for i, r in enumerate(rows_r.mappings().all(), 1):
        entries.append({
            "rank": i,
            "user_id": str(r["id"]),
            "display_name": r["display_name"],
            "avatar_url": r["avatar_url"],
            "role": r["role"],
            "completed_courses": r["completed_courses"],
            "total_xp_earned": r["total_xp_earned"] or 0,
        })
    return {"entries": entries, "total": len(entries)}
