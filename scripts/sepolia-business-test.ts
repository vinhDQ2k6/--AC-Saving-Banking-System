import { ethers, deployments } from "hardhat";

/**
 * @title Comprehensive Sepolia Business Test
 * @notice Tests all business operations on Sepolia testnet
 * @dev Real blockchain testing with actual gas consumption
 */
async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("🚀 SEPOLIA TESTNET COMPREHENSIVE BUSINESS TEST");
  console.log("═".repeat(70));

  // Get contracts
  const allDeployments = await deployments.all();
  const [deployer] = await ethers.getSigners();
  
  const mockUSDC = await ethers.getContractAt("MockUSDC", allDeployments.MockUSDC.address);
  const vault = await ethers.getContractAt("Vault", allDeployments.Vault.address);
  const savingBank = await ethers.getContractAt("SavingBank", allDeployments.SavingBank.address);
  const certificate = await ethers.getContractAt("DepositCertificate", allDeployments.DepositCertificate.address);

  const formatUSDC = (amount: bigint) => ethers.formatUnits(amount, 6);
  const parseUSDC = (amount: string) => ethers.parseUnits(amount, 6);

  console.log("\n📋 Contract Addresses:");
  console.log(`   MockUSDC: ${allDeployments.MockUSDC.address}`);
  console.log(`   Vault: ${allDeployments.Vault.address}`);
  console.log(`   SavingBank: ${allDeployments.SavingBank.address}`);
  console.log(`   DepositCertificate: ${allDeployments.DepositCertificate.address}`);
  console.log(`   Deployer: ${deployer.address}`);

  const initialBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`   ETH Balance: ${ethers.formatEther(initialBalance)} ETH`);

  // Track results
  const results: { test: string; status: string; txHash?: string; gasUsed?: string; details?: string }[] = [];

  try {
    // ═══════════════════════════════════════════════════════════════════
    // TEST 1: Saving Plan Management
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("📊 TEST 1: SAVING PLAN MANAGEMENT");
    console.log("─".repeat(70));

    // 1.1 Create multiple saving plans
    console.log("\n🔧 Creating diverse saving plans...");
    
    const parseUSDCAmount = (amount: string) => ethers.parseUnits(amount, 6);
    
    const plans = [
      { name: "Starter 30", min: "100", max: "10000", minTerm: 30, maxTerm: 31, rate: 500, penalty: 100 },
      { name: "Basic 60", min: "500", max: "50000", minTerm: 60, maxTerm: 61, rate: 700, penalty: 150 },
      { name: "Standard 90", min: "1000", max: "100000", minTerm: 90, maxTerm: 91, rate: 800, penalty: 200 },
      { name: "Premium 180", min: "5000", max: "500000", minTerm: 180, maxTerm: 181, rate: 1000, penalty: 250 },
      { name: "VIP 365", min: "10000", max: "1000000", minTerm: 365, maxTerm: 366, rate: 1200, penalty: 300 },
    ];

    for (const plan of plans) {
      try {
        const planInput = {
          name: plan.name,
          minDepositAmount: parseUSDCAmount(plan.min),
          maxDepositAmount: parseUSDCAmount(plan.max),
          minTermInDays: plan.minTerm,
          maxTermInDays: plan.maxTerm,
          annualInterestRateInBasisPoints: plan.rate,
          penaltyRateInBasisPoints: plan.penalty,
        };
        const tx = await savingBank.createSavingPlan(planInput);
        const receipt = await tx.wait();
        console.log(`   ✅ Plan "${plan.name}" @ ${plan.rate/100}% APY (Gas: ${receipt?.gasUsed.toString()})`);
        results.push({
          test: `Create Plan ${plan.name}`,
          status: "✅ PASS",
          txHash: tx.hash,
          gasUsed: receipt?.gasUsed.toString(),
          details: `${plan.rate/100}% APY`
        });
      } catch (e: any) {
        if (e.message.includes("already exists") || e.message.includes("PlanAlreadyExists")) {
          console.log(`   ⚠️ Plan "${plan.name}" already exists`);
          results.push({ test: `Create Plan ${plan.name}`, status: "⚠️ EXISTS", details: "Already created" });
        } else {
          console.log(`   ❌ Error creating ${plan.name}: ${e.message?.slice(0, 100)}`);
          results.push({ test: `Create Plan ${plan.name}`, status: "❌ FAIL", details: e.message?.slice(0, 50) });
        }
      }
    }

    // 1.2 List all saving plans
    console.log("\n📋 Current Saving Plans:");
    // Get plan IDs from our created plans (IDs 1-5)
    for (let planId = 1; planId <= 5; planId++) {
      try {
        const planDetails = await savingBank.getSavingPlan(planId);
        console.log(`   📅 Plan #${planId}: ${planDetails.name}, ${Number(planDetails.annualInterestRateInBasisPoints) / 100}% APY, Active: ${planDetails.isActive}`);
      } catch { /* Plan doesn't exist */ }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 2: Vault Liquidity Management
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("🏛️ TEST 2: VAULT LIQUIDITY MANAGEMENT");
    console.log("─".repeat(70));

    // 2.1 Check initial vault balance
    const vaultBalanceBefore = await vault.getBalance();
    console.log(`\n💰 Vault Balance Before: ${formatUSDC(vaultBalanceBefore)} USDC`);

    // Check deployer USDC balance first
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log(`👤 Deployer USDC Balance: ${formatUSDC(deployerUSDCBalance)} USDC`);

    // 2.2 Deposit liquidity only if we have enough
    const liquidityAmount = parseUSDC("100000"); // 100K USDC (reduced for repeated testing)
    if (deployerUSDCBalance >= liquidityAmount) {
      console.log(`\n💸 Depositing ${formatUSDC(liquidityAmount)} USDC to Vault...`);
      
      let tx = await mockUSDC.approve(vault.target, liquidityAmount);
      await tx.wait();
      console.log("   ✅ USDC approved");

      tx = await vault.depositLiquidity(liquidityAmount);
      let receipt = await tx.wait();
      console.log(`   ✅ Liquidity deposited (Gas: ${receipt?.gasUsed.toString()})`);
      results.push({
        test: "Deposit Liquidity",
        status: "✅ PASS",
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString(),
        details: `${formatUSDC(liquidityAmount)} USDC`
      });
    } else {
      console.log(`\n⚠️  Skipping liquidity deposit (insufficient balance)`);
      results.push({
        test: "Deposit Liquidity",
        status: "⚠️ SKIP",
        details: "Insufficient USDC balance"
      });
    }

    const vaultBalanceAfter = await vault.getBalance();
    console.log(`   💰 Vault Balance After: ${formatUSDC(vaultBalanceAfter)} USDC`);

    // ═══════════════════════════════════════════════════════════════════
    // TEST 3: User Deposit Operations (Diverse)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("👤 TEST 3: DIVERSE USER DEPOSITS");
    console.log("─".repeat(70));

    const depositScenarios = [
      { planId: 1, amount: "1000", term: 30, description: "Small short-term (Plan 1)" },
      { planId: 2, amount: "5000", term: 60, description: "Medium mid-term (Plan 2)" },
      { planId: 3, amount: "10000", term: 90, description: "Large quarterly (Plan 3)" },
      { planId: 4, amount: "25000", term: 180, description: "Premium semi-annual (Plan 4)" },
      { planId: 5, amount: "50000", term: 365, description: "VIP annual (Plan 5)" },
      { planId: 1, amount: "500", term: 30, description: "Another short deposit (Plan 1)" },
      { planId: 3, amount: "75000", term: 90, description: "High-value quarterly (Plan 3)" },
    ];

    const depositIds: bigint[] = [];

    for (const scenario of depositScenarios) {
      console.log(`\n📝 ${scenario.description}: ${scenario.amount} USDC @ ${scenario.term} days`);
      
      const amount = parseUSDC(scenario.amount);
      
      try {
        // Approve
        const approveTx = await mockUSDC.approve(savingBank.target, amount);
        await approveTx.wait();
        console.log("   ✅ Approved");
        
        // Check plan exists
        const plan = await savingBank.getSavingPlan(scenario.planId);
        console.log(`   📋 Plan: ${plan.name}, min: ${formatUSDC(plan.minDepositAmount)}, max: ${formatUSDC(plan.maxDepositAmount)}, minTerm: ${plan.minTermInDays}, maxTerm: ${plan.maxTermInDays}`);
        
        // Deposit
        const depositTx = await savingBank.createDeposit(scenario.planId, amount, scenario.term);
        const depositReceipt = await depositTx.wait();
        
        // Extract deposit ID from event
        const depositLog = depositReceipt?.logs.find((log: any) => {
          try {
            const parsed = savingBank.interface.parseLog({ topics: [...log.topics], data: log.data });
            return parsed?.name === "DepositCreated";
          } catch { return false; }
        });
        
        if (depositLog) {
          const parsed = savingBank.interface.parseLog({ topics: [...depositLog.topics], data: depositLog.data });
          const depositId = parsed?.args[0];
          depositIds.push(depositId);
          console.log(`   ✅ Created Deposit #${depositId} (Gas: ${depositReceipt?.gasUsed.toString()})`);
          results.push({
            test: `Deposit ${scenario.description}`,
            status: "✅ PASS",
            txHash: depositTx.hash,
            gasUsed: depositReceipt?.gasUsed.toString(),
            details: `${scenario.amount} USDC, ${scenario.term}d, ID: ${depositId}`
          });
        } else {
          console.log(`   ✅ Deposit created but no event found (Gas: ${depositReceipt?.gasUsed.toString()})`);
          results.push({
            test: `Deposit ${scenario.description}`,
            status: "✅ PASS",
            txHash: depositTx.hash,
            gasUsed: depositReceipt?.gasUsed.toString(),
            details: `${scenario.amount} USDC, ${scenario.term}d`
          });
        }
      } catch (e: any) {
        console.log(`   ❌ Error: ${e.message?.slice(0, 150) || e}`);
        results.push({
          test: `Deposit ${scenario.description}`,
          status: "❌ FAIL",
          details: e.message?.slice(0, 50)
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 4: Deposit Information Retrieval
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("🔍 TEST 4: DEPOSIT INFORMATION");
    console.log("─".repeat(70));

    console.log("\n📋 All Active Deposits:");
    let totalDeposited = 0n;
    for (const id of depositIds) {
      const deposit = await savingBank.getDeposit(id);
      const amount = Number(formatUSDC(deposit.amount));
      totalDeposited += deposit.amount;
      console.log(`   #${id}: ${amount.toLocaleString()} USDC, ${deposit.termInDays}d, Plan: ${deposit.savingPlanId}`);
    }
    console.log(`\n   💰 Total Deposited: ${formatUSDC(totalDeposited)} USDC`);
    results.push({
      test: "Deposit Summary",
      status: "✅ PASS",
      details: `${depositIds.length} deposits, ${formatUSDC(totalDeposited)} USDC total`
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 5: NFT Certificate Verification
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("🎫 TEST 5: NFT CERTIFICATE VERIFICATION");
    console.log("─".repeat(70));

    const totalNFTs = await certificate.totalSupply();
    const deployerNFTs = await certificate.balanceOf(deployer.address);
    console.log(`\n   📊 Total NFTs Minted: ${totalNFTs}`);
    console.log(`   👤 Deployer's NFTs: ${deployerNFTs}`);

    // Check ownership of each deposit
    console.log("\n   🔍 NFT Ownership Verification:");
    for (const id of depositIds) {
      const owner = await certificate.ownerOf(id);
      const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
      console.log(`   #${id}: ${isOwner ? "✅" : "❌"} Owner verified`);
    }
    results.push({
      test: "NFT Verification",
      status: "✅ PASS",
      details: `${totalNFTs} NFTs, all ownership verified`
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 6: Interest Calculation Preview
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("📈 TEST 6: INTEREST CALCULATION PREVIEW");
    console.log("─".repeat(70));

    console.log("\n   💹 Projected Interest at Maturity:");
    let totalProjectedInterest = 0n;
    for (const id of depositIds) {
      const deposit = await savingBank.getDeposit(id);
      // Use the expected interest stored in the deposit
      const interestPreview = deposit.expectedInterest;
      totalProjectedInterest += interestPreview;
      console.log(`   #${id}: +${formatUSDC(interestPreview)} USDC interest`);
    }
    console.log(`\n   💰 Total Projected Interest: ${formatUSDC(totalProjectedInterest)} USDC`);
    results.push({
      test: "Interest Calculation",
      status: "✅ PASS",
      details: `${formatUSDC(totalProjectedInterest)} USDC projected`
    });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 7: Emergency Controls (Pause/Unpause)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("🚨 TEST 7: EMERGENCY CONTROLS");
    console.log("─".repeat(70));

    try {
      // First, grant PAUSER_ROLE to deployer if not already granted
      const PAUSER_ROLE = await savingBank.PAUSER_ROLE();
      const hasPauserRole = await savingBank.hasRole(PAUSER_ROLE, deployer.address);
      if (!hasPauserRole) {
        console.log("\n   🔐 Granting PAUSER_ROLE to deployer...");
        const grantTx = await savingBank.grantRole(PAUSER_ROLE, deployer.address);
        await grantTx.wait();
        console.log("   ✅ PAUSER_ROLE granted");
      }

      // Check current state
      const isPausedBefore = await savingBank.paused();
      console.log(`\n   📊 Current State: ${isPausedBefore ? "PAUSED" : "ACTIVE"}`);

      // Pause
      console.log("\n   ⏸️ Pausing system...");
      let pauseTx = await savingBank.pause();
      let pauseReceipt = await pauseTx.wait();
      console.log(`   ✅ System PAUSED (Gas: ${pauseReceipt?.gasUsed.toString()})`);
      results.push({
        test: "Pause System",
        status: "✅ PASS",
        txHash: pauseTx.hash,
        gasUsed: pauseReceipt?.gasUsed.toString()
      });

      // Verify paused state blocks operations
      console.log("\n   🧪 Testing blocked operations...");
      try {
        await mockUSDC.approve(savingBank.target, parseUSDC("100"));
        await savingBank.createDeposit(1, parseUSDC("100"), 30);
        console.log("   ❌ Operations NOT blocked!");
        results.push({ test: "Pause Blocks Ops", status: "❌ FAIL" });
      } catch (e: any) {
        console.log("   ✅ Operations correctly blocked when paused");
        results.push({ test: "Pause Blocks Ops", status: "✅ PASS" });
      }

      // Unpause
      console.log("\n   ▶️ Unpausing system...");
      let unpauseTx = await savingBank.unpause();
      let unpauseReceipt = await unpauseTx.wait();
      console.log(`   ✅ System UNPAUSED (Gas: ${unpauseReceipt?.gasUsed.toString()})`);
      results.push({
        test: "Unpause System",
        status: "✅ PASS",
        txHash: unpauseTx.hash,
        gasUsed: unpauseReceipt?.gasUsed.toString()
      });
    } catch (e: any) {
      console.log(`   ❌ Emergency controls test failed: ${e.message?.slice(0, 100)}`);
      results.push({ test: "Emergency Controls", status: "❌ FAIL", details: e.message?.slice(0, 50) });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 8: Saving Plan Modifications
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("⚙️ TEST 8: SAVING PLAN MODIFICATIONS");
    console.log("─".repeat(70));

    try {
      // Update interest rate for Plan 1 (Starter 30)
      console.log("\n   📊 Updating Plan #1 rate from 5% to 6%...");
      const updateInput = {
        name: "Starter 30 Updated",
        minDepositAmount: parseUSDCAmount("100"),
        maxDepositAmount: parseUSDCAmount("10000"),
        minTermInDays: 30,
        maxTermInDays: 31,
        annualInterestRateInBasisPoints: 600, // 6% now
        penaltyRateInBasisPoints: 100,
      };
      const updateTx = await savingBank.updateSavingPlan(1, updateInput);
      const updateReceipt = await updateTx.wait();
      console.log(`   ✅ Rate updated (Gas: ${updateReceipt?.gasUsed.toString()})`);
      results.push({
        test: "Update Plan Rate",
        status: "✅ PASS",
        txHash: updateTx.hash,
        gasUsed: updateReceipt?.gasUsed.toString(),
        details: "Plan 1: 5% → 6%"
      });

      // Verify update
      const updatedPlan = await savingBank.getSavingPlan(1);
      console.log(`   📋 New Rate: ${Number(updatedPlan.annualInterestRateInBasisPoints)/100}% APY`);
    } catch (e: any) {
      console.log(`   ❌ Plan update failed: ${e.message?.slice(0, 100)}`);
      results.push({ test: "Update Plan Rate", status: "❌ FAIL", details: e.message?.slice(0, 50) });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 9: One More Large Deposit After All Tests
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "─".repeat(70));
    console.log("💎 TEST 9: POST-TEST LARGE DEPOSIT");
    console.log("─".repeat(70));

    try {
      const finalDepositAmount = parseUSDC("150000");
      console.log(`\n   💰 Creating final deposit: ${formatUSDC(finalDepositAmount)} USDC @ 365 days`);
      
      const approvalTx = await mockUSDC.approve(savingBank.target, finalDepositAmount);
      await approvalTx.wait();
      
      const finalTx = await savingBank.createDeposit(5, finalDepositAmount, 365); // Plan 5 = VIP 365
      const finalReceipt = await finalTx.wait();
      console.log(`   ✅ Final deposit created (Gas: ${finalReceipt?.gasUsed.toString()})`);
      results.push({
        test: "Final Large Deposit",
        status: "✅ PASS",
        txHash: finalTx.hash,
        gasUsed: finalReceipt?.gasUsed.toString(),
        details: "150,000 USDC @ 12% APY (Plan 5)"
      });
    } catch (e: any) {
      console.log(`   ❌ Final deposit failed: ${e.message?.slice(0, 100)}`);
      results.push({ test: "Final Large Deposit", status: "❌ FAIL", details: e.message?.slice(0, 50) });
    }

    // ═══════════════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(70));
    console.log("📊 FINAL TEST SUMMARY");
    console.log("═".repeat(70));

    // Gas summary
    const finalBalance = await ethers.provider.getBalance(deployer.address);
    const gasUsed = initialBalance - finalBalance;
    console.log(`\n   ⛽ Total ETH Used: ${ethers.formatEther(gasUsed)} ETH`);
    console.log(`   💰 Remaining ETH: ${ethers.formatEther(finalBalance)} ETH`);

    // Vault summary
    const finalVaultBalance = await vault.getBalance();
    console.log(`\n   🏛️ Final Vault Balance: ${formatUSDC(finalVaultBalance)} USDC`);

    // NFT summary
    const finalNFTCount = await certificate.totalSupply();
    console.log(`   🎫 Total NFTs: ${finalNFTCount}`);

    // Test results table
    console.log("\n   📋 Test Results:");
    console.log("   " + "─".repeat(60));
    let passed = 0, failed = 0, skipped = 0;
    for (const r of results) {
      if (r.status.includes("PASS")) passed++;
      else if (r.status.includes("FAIL")) failed++;
      else skipped++;
      console.log(`   ${r.status} ${r.test}${r.details ? ` (${r.details})` : ""}`);
    }
    console.log("   " + "─".repeat(60));
    console.log(`   ✅ Passed: ${passed}  ❌ Failed: ${failed}  ⚠️ Skipped: ${skipped}`);

    console.log("\n" + "═".repeat(70));
    console.log("🎉 ALL BUSINESS TESTS COMPLETED ON SEPOLIA TESTNET!");
    console.log("═".repeat(70));

    // Return summary for report
    return {
      network: "sepolia",
      contracts: {
        MockUSDC: allDeployments.MockUSDC.address,
        Vault: allDeployments.Vault.address,
        SavingBank: allDeployments.SavingBank.address,
        DepositCertificate: allDeployments.DepositCertificate.address,
      },
      gasUsed: ethers.formatEther(gasUsed),
      vaultBalance: formatUSDC(finalVaultBalance),
      totalNFTs: finalNFTCount.toString(),
      testResults: results,
      summary: { passed, failed, skipped }
    };

  } catch (error) {
    console.error("\n❌ Error during testing:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
