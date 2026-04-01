// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract WKToken is ERC20,ERC20Burnable,ERC20Permit,ERC20Votes,AccessControl,Pausable,ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 public constant MAX_SUPPLY     = 10_000_000_000 * 1e18;
    uint256 public constant MAX_DAILY_MINT =     10_000_000 * 1e18;
    uint256 public constant STAKE_APY_BPS  = 500;
    uint256 public mintedToday;
    uint256 public mintDayStart;
    struct StakeInfo { uint256 amount; uint256 since; }
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    event Minted(address indexed to, uint256 amount, string reason);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 principal, uint256 reward);
    event RewardClaimed(address indexed user, uint256 reward);
    event EmergencyRecover(address indexed admin, address token, address to, uint256 amount);
    constructor(address treasury,address ecosystemFund,address teamVesting,address admin)
        ERC20("WellKOC Token","WK") ERC20Permit("WellKOC Token") {
        require(treasury!=address(0),"WK:treasury=0");
        require(ecosystemFund!=address(0),"WK:ecosystem=0");
        require(teamVesting!=address(0),"WK:vesting=0");
        require(admin!=address(0),"WK:admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE,admin);
        _grantRole(MINTER_ROLE,admin);
        _grantRole(PAUSER_ROLE,admin);
        mintDayStart=block.timestamp;
        _mintSafe(treasury,3_000_000_000*1e18,"Treasury 30%");
        _mintSafe(ecosystemFund,2_000_000_000*1e18,"Ecosystem 20%");
        _mintSafe(teamVesting,1_000_000_000*1e18,"Team 10%");
    }
    function mint(address to,uint256 amount,string calldata reason) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to!=address(0),"WK:mint to 0");
        require(totalSupply()+amount<=MAX_SUPPLY,"WK:exceeds MAX_SUPPLY");
        if(block.timestamp>=mintDayStart+1 days){mintedToday=0;mintDayStart=block.timestamp;}
        require(mintedToday+amount<=MAX_DAILY_MINT,"WK:daily limit");
        mintedToday+=amount;
        _mint(to,amount);
        emit Minted(to,amount,reason);
    }
    function _mintSafe(address to,uint256 amount,string memory reason) internal {
        require(totalSupply()+amount<=MAX_SUPPLY,"WK:exceeds MAX_SUPPLY");
        _mint(to,amount);
        emit Minted(to,amount,reason);
    }
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount>0,"WK:stake 0");
        require(balanceOf(msg.sender)>=amount,"WK:balance");
        _claimReward(msg.sender);
        _transfer(msg.sender,address(this),amount);
        stakes[msg.sender].amount+=amount;
        stakes[msg.sender].since=block.timestamp;
        totalStaked+=amount;
        emit Staked(msg.sender,amount);
    }
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage info=stakes[msg.sender];
        require(info.amount>=amount,"WK:insufficient staked");
        uint256 reward=_pendingReward(msg.sender);
        info.amount-=amount;
        totalStaked-=amount;
        _transfer(address(this),msg.sender,amount);
        if(reward>0&&totalSupply()+reward<=MAX_SUPPLY) _mint(msg.sender,reward);
        info.since=info.amount>0?block.timestamp:0;
        emit Unstaked(msg.sender,amount,reward);
    }
    function claimReward() external nonReentrant whenNotPaused { _claimReward(msg.sender); }
    function _claimReward(address user) internal {
        uint256 reward=_pendingReward(user);
        if(reward==0||totalSupply()+reward>MAX_SUPPLY) return;
        stakes[user].since=block.timestamp;
        _mint(user,reward);
        emit RewardClaimed(user,reward);
    }
    function _pendingReward(address user) internal view returns(uint256) {
        StakeInfo storage info=stakes[user];
        if(info.amount==0||info.since==0) return 0;
        return(info.amount*STAKE_APY_BPS*(block.timestamp-info.since))/(10_000*365 days);
    }
    function pendingReward(address user) external view returns(uint256){ return _pendingReward(user); }
    function stakeInfo(address user) external view returns(uint256 amount,uint256 since,uint256 pending){
        StakeInfo storage info=stakes[user];
        return(info.amount,info.since,_pendingReward(user));
    }
    function remainingSupply() external view returns(uint256){ return MAX_SUPPLY-totalSupply(); }
    function pause() external onlyRole(PAUSER_ROLE){ _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE){ _unpause(); }
    function emergencyRecover(address token,address to,uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(to!=address(0),"WK:to=0");
        if(token==address(this)){
            uint256 free=balanceOf(address(this))>totalStaked?balanceOf(address(this))-totalStaked:0;
            require(amount<=free,"WK:cannot drain staked");
        }
        (bool ok,)=token.call(abi.encodeWithSignature("transfer(address,uint256)",to,amount));
        require(ok,"WK:recover failed");
        emit EmergencyRecover(msg.sender,token,to,amount);
    }
    function _update(address from,address to,uint256 value) internal override(ERC20,ERC20Votes){
        require(!paused()||from==address(0)||to==address(0),"WK:paused");
        super._update(from,to,value);
    }
    function nonces(address owner) public view override(ERC20Permit,Nonces) returns(uint256){ return super.nonces(owner); }
}
