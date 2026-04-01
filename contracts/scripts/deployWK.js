const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = (await ethers.provider.getNetwork()).name;
  const bal = ethers.formatEther(await ethers.provider.getBalance(deployer.address));
  console.log(`\n🚀 Deploying WK Token`);
  console.log(`   Network:  ${net}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance:  ${bal} MATIC\n`);

  // ── Wallets from .env (or fallback to deployer for testnet) ──
  const TREASURY       = process.env.TREASURY_WALLET       || deployer.address;
  const ECOSYSTEM_FUND = process.env.ECOSYSTEM_FUND_WALLET || deployer.address;
  const TEAM_WALLET    = process.env.TEAM_WALLET            || deployer.address;
  const ADMIN_WALLET   = process.env.ADMIN_MULTISIG         || deployer.address;

  console.log(`   Treasury:      ${TREASURY}`);
  console.log(`   Ecosystem:     ${ECOSYSTEM_FUND}`);
  console.log(`   Team wallet:   ${TEAM_WALLET}`);
  console.log(`   Admin/multisig:${ADMIN_WALLET}\n`);

  // 1. Deploy TeamVesting
  console.log("1/2 Deploying TeamVesting...");
  const TV = await ethers.getContractFactory("TeamVesting");
  // Constructor needs token address — deploy placeholder first, then update
  // Actually TeamVesting needs WK address → deploy WK first with vesting=deployer, then transfer
  // Simpler: deploy WK with team allocation going to a temp address, transfer after

  // 2. Deploy WKToken
  console.log("2/2 Deploying WKToken...");
  const WK = await ethers.getContractFactory("WKToken");
  const wk = await WK.deploy(TREASURY, ECOSYSTEM_FUND, TEAM_WALLET, ADMIN_WALLET);
  await wk.waitForDeployment();
  const wkAddr = await wk.getAddress();
  console.log(`   ✅ WKToken deployed: ${wkAddr}`);

  // Deploy TeamVesting after WK is known
  console.log("   Deploying TeamVesting with WK address...");
  const tv = await TV.deploy(wkAddr, TEAM_WALLET, ADMIN_WALLET);
  await tv.waitForDeployment();
  const tvAddr = await tv.getAddress();
  console.log(`   ✅ TeamVesting deployed: ${tvAddr}`);

  // Verify supply
  const supply = ethers.formatEther(await wk.totalSupply());
  const remaining = ethers.formatEther(await wk.remainingSupply());
  console.log(`\n📊 WK Token Stats — 1,000,000,000 total supply`);
  console.log(`   Total supply: ${supply} WK`);
  console.log(`   Remaining:    ${remaining} WK (KOC rewards pool)`);

  console.log(`\n✅ DEPLOYMENT COMPLETE`);
  console.log(`\nAdd to .env:`);
  console.log(`WK_TOKEN_ADDRESS=${wkAddr}`);
  console.log(`TEAM_VESTING_ADDRESS=${tvAddr}`);
  console.log(`\nVerify on Polygonscan:`);
  console.log(`npx hardhat verify --network ${net} ${wkAddr} "${TREASURY}" "${ECOSYSTEM_FUND}" "${TEAM_WALLET}" "${ADMIN_WALLET}"`);
}

main().catch(e => { console.error(e); process.exit(1); });
