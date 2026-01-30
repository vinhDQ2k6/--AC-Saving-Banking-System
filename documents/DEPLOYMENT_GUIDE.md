# 🚀 HƯỚNG DẪN DEPLOY CHI TIẾT

## 🎯 Giải thích đơn giản (Phương pháp Feynman)

### Multisig là gì và tại sao cần thiết?

**Hãy tưởng tượng:** Bạn có một két sắt rất quan trọng chứa tiền của cả ngân hàng. Thay vì chỉ có 1 chiếc chìa khóa (rất nguy hiểm nếu mất), bạn tạo ra 5 chiếc chìa khóa và đưa cho 5 người bạn tin tưởng. Để mở két, cần ít nhất 3 người trong số 5 người này phải đồng ý và dùng chìa khóa của họ cùng lúc.

**Trong blockchain:**
- **Single Admin** = 1 chìa khóa = Nguy hiểm cao (nếu private key bị hack hoặc mất)
- **Multisig 3/5** = 3 chìa khóa trong số 5 = An toàn hơn nhiều
- **Các thao tác quan trọng** như pause hệ thống, rút tiền từ vault đều cần đa số người đồng ý

### Quy trình Deploy thực tế:
1. **Deploy contracts** bằng 1 wallet tạm thời (như thợ xây)
2. **Setup Multisig** với 3-5 người tin tưởng (như hội đồng quản trị)
3. **Transfer quyền admin** từ wallet tạm sang Multisig
4. **Xóa wallet tạm** → Chỉ Multisig mới có quyền điều khiển

---

## Tổng quan

Hệ thống Saving Banking sử dụng **5-stage deployment sequence** để đảm bảo tính bảo mật và tách biệt vai trò:

1. **MockUSDC** - Token test/production
2. **DepositCertificate** - NFT certificates với 24h cooldown
3. **Vault** - Quản lý thanh khoản 
4. **SavingBank** - Logic nghiệp vụ chính + setup roles
5. **AdminSecurity** - Transfer admin sang multisig (production only)

---

## 🔧 I. CHUẨN BỊ ENVIRONMENT

### 1.1 Cài đặt Dependencies

```bash
# Clone repository
git clone <repository-url>
cd AC-Save-Banking-Revamp

# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

### 1.2 Cấu hình Environment

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Cập nhật `.env`:

```bash
# Network Configuration
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Deployment Wallet
TESTNET_PRIVATE_KEY=0x... # Wallet để deploy (cần ETH để trả gas)
MAINNET_PRIVATE_KEY=0x... # Production wallet (khác với testnet)

# Contract Verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Security (Production Only)
MULTISIG_ADDRESS=0x... # Gnosis Safe multisig address
```

### 1.3 Kiểm tra Network Configuration

```bash
# Test Sepolia connection
npx hardhat verify --network sepolia --help

# Check deployer balance
npx hardhat run scripts/check-balance.js --network sepolia
```

---

## 🏠 II. LOCAL DEPLOYMENT (Development)

### 2.1 Start Local Hardhat Network

```bash
# Terminal 1: Start local network
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat deploy --network localhost
```

### 2.2 Verify Local Deployment

```bash
# Run full test suite
npx hardhat test --network localhost

# Check contract interactions
npx hardhat console --network localhost
```

**Expected Output:**
```
✅ MockUSDC deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ DepositCertificate deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ Vault deployed at: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
✅ SavingBank deployed at: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
✅ Admin roles properly configured
```

---

## 🧪 III. TESTNET DEPLOYMENT (Sepolia)

### 3.1 Pre-deployment Checklist

```bash
# ✅ Kiểm tra wallet có ETH
npx hardhat run scripts/check-balance.js --network sepolia

# ✅ Compile contracts
npx hardhat compile

# ✅ Run tests
npx hardhat test
```

### 3.2 Deploy Contracts to Sepolia

**Step 1: Deploy MockUSDC**
```bash
npx hardhat deploy --tags MockUSDC --network sepolia
```

**Step 2: Deploy DepositCertificate**  
```bash
npx hardhat deploy --tags DepositCertificate --network sepolia
```

**Step 3: Deploy Vault**
```bash
npx hardhat deploy --tags Vault --network sepolia
```

**Step 4: Deploy SavingBank + Setup Roles**
```bash
npx hardhat deploy --tags SavingBank --network sepolia
```

**Step 5: Setup Admin Security (Optional for testnet)**
```bash
# Only if you have multisig setup
MULTISIG_ADDRESS=0x... npx hardhat deploy --tags AdminSecurity --network sepolia
```

### 3.3 Contract Verification

```bash
# Get deployment addresses
cat deployments/sepolia/.chainId  # Verify network
ls deployments/sepolia/           # List deployed contracts

# Verify each contract
npx hardhat verify --network sepolia <MOCK_USDC_ADDRESS>

npx hardhat verify --network sepolia <CERTIFICATE_ADDRESS> \
  "SavingBank Deposit Certificate" "SBDC"

npx hardhat verify --network sepolia <VAULT_ADDRESS> <MOCK_USDC_ADDRESS>

npx hardhat verify --network sepolia <SAVINGBANK_ADDRESS> \
  <MOCK_USDC_ADDRESS> <CERTIFICATE_ADDRESS> <VAULT_ADDRESS>
```

### 3.4 Post-Deployment Testing

```bash
# Test basic functionality
npx hardhat run scripts/test-deployment.js --network sepolia

# Create a test saving plan
npx hardhat run scripts/create-test-plan.js --network sepolia

# Test deposit flow
npx hardhat run scripts/test-deposit.js --network sepolia
```

---

## 🏭 IV. MAINNET DEPLOYMENT (Production)

### 4.1 Pre-production Security Checklist

- [ ] **External Audit Completed** - Contract audit report available
- [ ] **Multisig Wallet Ready** - Gnosis Safe 2/3 hoặc 3/5 setup
- [ ] **Gas Price Strategy** - Monitor gas prices, deploy during low congestion  
- [ ] **Deployment Wallet Security** - Hardware wallet recommended
- [ ] **Emergency Procedures** - Pause contract procedures documented
- [ ] **Monitoring Setup** - Block explorer alerts configured

### 4.2 🔐 Multisig Wallet Setup Chi Tiết

**Bước 1: Hiểu về Multisig trước khi làm**

**Multisig hoạt động như thế nào:**
```
Ví dụ 3/5 Multisig:
👤 Person A: có private key A
👤 Person B: có private key B  
👤 Person C: có private key C
👤 Person D: có private key D
👤 Person E: có private key E

🔒 Để thực hiện 1 transaction:
- Cần ít nhất 3 trong 5 người ký (approve)
- Không thể 1 người nào đó tự ý làm gì
- Nếu 1-2 người mất private key → vẫn OK
- Nếu 3+ người mất private key → RIP 💀
```

**Bước 2: Tạo Gnosis Safe Multisig**

1. **Đi đến https://app.safe.global**
2. **Connect wallet** (wallet này sẽ là 1 trong những signer)
3. **Chọn "Create new Safe"**
4. **Cấu hình Safe:**
   ```
   Network: Ethereum Mainnet
   Safe name: "SavingBank Admin Safe"
   
   👥 Owners (Signers):
   Owner 1: 0xYourWallet1... (CEO)
   Owner 2: 0xYourWallet2... (CTO)  
   Owner 3: 0xYourWallet3... (CFO)
   Owner 4: 0xYourWallet4... (Security Expert)
   Owner 5: 0xYourWallet5... (Legal Advisor)
   
   🔢 Threshold: 3 (cần 3/5 người ký)
   ```
5. **Review & Deploy** (tốn gas để deploy Safe contract)
6. **Lưu lại Safe address** (VD: 0x1234...abcd)

**Bước 3: Test Multisig hoạt động**

```bash
# Test với transaction nhỏ trước
# 1. Gửi 0.01 ETH vào Safe
# 2. Thử rút 0.005 ETH ra
# 3. Xem cần mấy người ký
# 4. Confirm workflow hoạt động
```

**Bước 4: Document & Security**

📝 **Tạo file MULTISIG_RECOVERY.md:**
```markdown
# 🔐 MULTISIG RECOVERY PROCEDURES

## Safe Information
- Address: 0x1234...abcd
- Network: Ethereum Mainnet  
- Threshold: 3/5

## Signers
1. CEO Wallet: 0x... (Hardware Ledger)
2. CTO Wallet: 0x... (MetaMask + Hardware)
3. CFO Wallet: 0x... (Gnosis Safe Mobile)
4. Security Expert: 0x... (Hardware Trezor)
5. Legal Advisor: 0x... (MetaMask)

## Emergency Contacts
- CEO: +1-xxx-xxx-xxxx
- CTO: email@company.com
- Backup procedures if 2+ people unavailable
```

**Bước 5: Update Environment**

```bash
# Thêm vào .env
MULTISIG_ADDRESS=0x1234...abcd  # Safe address vừa tạo

# Test connection
npx hardhat run scripts/check-multisig.js --network mainnet
```

### 4.3 Production Deployment Sequence

⚠️ **Warning: Mainnet deployment costs real ETH. Double-check all parameters!**

```bash
# Set production environment
export NODE_ENV=production
export MULTISIG_ADDRESS=0x...  # Your multisig address

# Deploy sequence (mainnet)
npx hardhat deploy --tags MockUSDC --network mainnet
npx hardhat deploy --tags DepositCertificate --network mainnet  
npx hardhat deploy --tags Vault --network mainnet
npx hardhat deploy --tags SavingBank --network mainnet

# 🔒 CRITICAL: Transfer admin to multisig
# ⚠️ ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT!

# Trước khi chạy lệnh này, hãy hiểu điều gì sẽ xảy ra:
echo "📋 ADMIN TRANSFER PROCESS:"
echo "1. Current admin: Your deployment wallet"
echo "2. New admin: Multisig Safe ($MULTISIG_ADDRESS)"
echo "3. After transfer: Only multisig can control contracts"
echo "4. Your deployment wallet will lose all admin rights"
echo ""
echo "⚠️  KHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn? (y/N)"
read -r confirmation

if [ "$confirmation" = "y" ]; then
  echo "🚀 Transferring admin rights to multisig..."
  npx hardhat deploy --tags AdminSecurity --network mainnet
  
  echo "✅ Admin transfer completed!"
  echo "🔍 Please verify with: npx hardhat run scripts/verify-admin-roles.js --network mainnet"
else
  echo "❌ Admin transfer cancelled"
fi
```

### 4.4 Production Contract Verification

```bash
# Verify on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESSES>

# Verify source code matches deployment
npx hardhat run scripts/verify-deployment.js --network mainnet
```

### 4.5 Post-deployment Security Verification

```bash
# Verify admin roles transferred to multisig
npx hardhat run scripts/verify-admin-roles.js --network mainnet

# Verify all role assignments correct
npx hardhat run scripts/check-roles.js --network mainnet

# Test emergency pause (via multisig)
# Test admin functions (via multisig)
```

---

## 🔍 V. DEPLOYMENT VERIFICATION

### 5.1 Contract Verification Checklist

```bash
# ✅ Contract Size Check
npx hardhat size-contracts

# ✅ Role Assignment Check  
npx hardhat run scripts/check-roles.js --network <NETWORK>

# ✅ Function Permission Check
npx hardhat run scripts/test-permissions.js --network <NETWORK>

# ✅ Integration Test
npx hardhat test --network <NETWORK>
```

### 5.2 Security Features Verification

| Feature | Verification Command |
|:--------|:---------------------|
| 24h Cooldown | `npx hardhat run scripts/test-cooldown.js --network <NETWORK>` |
| NFT Ownership | `npx hardhat run scripts/test-nft-withdrawal.js --network <NETWORK>` |
| Admin Transfer | `npx hardhat run scripts/verify-admin-roles.js --network <NETWORK>` |
| Emergency Pause | `npx hardhat run scripts/test-pause.js --network <NETWORK>` |

### 5.3 Frontend Integration Points

**Contract ABIs Location:**
```
artifacts/contracts/SavingBank.sol/SavingBank.json
artifacts/contracts/vault/Vault.sol/Vault.json  
artifacts/contracts/certificates/DepositCertificate.sol/DepositCertificate.json
```

**Key Contract Addresses (Update sau deployment):**
```javascript
const CONTRACT_ADDRESSES = {
  sepolia: {
    savingBank: "0x...",
    vault: "0x...", 
    depositCertificate: "0x...",
    mockUSDC: "0x..."
  },
  mainnet: {
    savingBank: "0x...",
    vault: "0x...",
    depositCertificate: "0x...", 
    usdc: "0xA0b86a33E6441E0F43a14c7A70C978de97E3F0f8" // Real USDC
  }
}
```

---

## � VI. MULTISIG OPERATIONS (Sau khi Deploy)

### 6.1 🎛️ Cách sử dụng Multisig hàng ngày

**Scenario 1: Tạo Savings Plan mới**

1. **Ai đó đề xuất** (có thể là CEO, CTO, hoặc bất kỳ ai)
2. **Tạo transaction proposal** trên Gnosis Safe:
   ```
   To: SavingBank Contract Address
   Function: createSavingPlan()
   Parameters: {
     name: "Premium Plan",
     minDeposit: 10000 USDC,
     maxDeposit: 1000000 USDC,
     minTerm: 90 days,
     maxTerm: 365 days,
     APR: 12%,
     penalty: 2%
   }
   ```
3. **Ít nhất 3/5 người phải approve**
4. **Người cuối cùng execute transaction**
5. **Plan được tạo thành công**

**Scenario 2: Emergency Pause**

```bash
# 🚨 KHI CÓ SỰ CỐ BẢO MẬT
# Bất kỳ ai trong team phát hiện vấn đề:

# 1. Thông báo ngay trong group chat
# 2. Tạo pause proposal trên Safe
# 3. Tất cả mọi người drop công việc và approve ASAP
# 4. Execute pause

# Ví dụ transaction:
# To: SavingBank Address  
# Function: pause()
# Data: 0x8456cb59 (function selector cho pause())
```

**Scenario 3: Quản lý Vault Liquidity**

```bash
# Khi cần thêm tiền vào vault để trả lãi:
# 1. CFO tính toán cần bao nhiêu USDC
# 2. Tạo proposal depositToVault(amount)
# 3. 3/5 người approve
# 4. Execute → tiền được chuyển vào vault

# Khi cần rút tiền thừa:
# 1. Tạo proposal withdrawFromVault(amount, recipient)
# 2. 3/5 người approve (cần justification rõ ràng)
# 3. Execute → tiền được rút về địa chỉ chỉ định
```

### 6.2 📱 Multisig Workflow Tools

**Option 1: Gnosis Safe Web App (Recommended)**
- Đi tới https://app.safe.global
- Connect wallet của bạn
- Select your Safe
- Propose, review, approve transactions

**Option 2: Gnosis Safe Mobile App**
- Download từ App Store/Play Store
- Import Safe bằng address
- Approve transactions on mobile

**Option 3: Programmatic (Advanced)**
```bash
# Tạo proposal qua script
npx hardhat run scripts/multisig-propose-pause.js --network mainnet

# Check pending proposals
npx hardhat run scripts/multisig-list-pending.js --network mainnet

# Approve pending proposal
npx hardhat run scripts/multisig-approve.js --network mainnet --proposal-id 123
```

### 6.3 ⚡ Multisig Emergency Response

**Level 1: Suspicious Activity**
```
🟡 YELLOW ALERT
1. Monitor transactions closely
2. Prepare pause proposal (don't execute yet)
3. Notify all signers
4. Investigate further
```

**Level 2: Confirmed Attack**
```
🟠 ORANGE ALERT
1. Execute pause() immediately
2. Notify all users via official channels  
3. Contact audit team
4. Preserve evidence
```

**Level 3: Critical Breach**
```
🔴 RED ALERT
1. Pause all operations
2. Emergency fund evacuation if possible
3. Legal team notification
4. Prepare recovery plan
```

## 🚨 VII. EMERGENCY PROCEDURES

### 7.1 Emergency Pause

**Quy trình Pause qua Multisig:**

```bash
# ⚠️ CHỈ CÓ THỂ THỰC HIỆN QUA MULTISIG

# Option 1: Qua Gnosis Safe Web Interface
echo "1. Đi tới https://app.safe.global"
echo "2. Chọn SavingBank Admin Safe"
echo "3. New Transaction → Contract Interaction"
echo "4. Address: $SAVINGBANK_ADDRESS"
echo "5. ABI: Upload SavingBank.json"
echo "6. Function: pause()"
echo "7. Submit → Chờ 3/5 người approve → Execute"

# Option 2: Qua Script (vẫn cần multisig approve)
npx hardhat run scripts/emergency-pause-propose.js --network mainnet

echo "📱 Thông báo tất cả signers approve ngay!"

# Check pause status
npx hardhat run scripts/check-pause-status.js --network mainnet
```

**Điều gì xảy ra khi pause:**
```
🔒 PAUSED STATE:
✅ Existing deposits: Vẫn earn interest
✅ Withdrawals at maturity: Vẫn được phép
✅ Admin functions: Vẫn hoạt động
❌ New deposits: Bị block
❌ Early withdrawals: Bị block  
❌ Renewals: Bị block
```

### 6.2 Admin Recovery

Nếu multisig bị compromised:

1. **Immediate Response:**
   ```bash
   # Pause all operations
   npx hardhat run scripts/emergency-pause.js --network mainnet
   ```

2. **Assessment:**
   - Review on-chain transactions
   - Identify scope of compromise
   - Contact audit firm if needed

3. **Recovery:**
   - Deploy new contracts if necessary
   - Migrate user funds if possible
   - Communicate via official channels

### 6.3 Contract Upgrade (Future)

*Note: Current contracts are not upgradeable. Future versions may implement proxy pattern.*

---

## 🛠️ VIII. TROUBLESHOOTING

### 8.1 Multisig Issues

**Issue: "Không thể approve transaction trên Safe"**
```bash
# Possible causes:
# 1. Wrong network (check you're on mainnet)
# 2. Wallet not connected to correct account  
# 3. Transaction already executed
# 4. Your wallet is not a signer

# Solutions:
echo "🔍 Debugging steps:"
echo "1. Check current network: $(npx hardhat run --network mainnet scripts/check-network.js)"
echo "2. Check your address: $(npx hardhat run --network mainnet scripts/check-address.js)"
echo "3. Check if you're a signer: npx hardhat run scripts/check-multisig-signers.js --network mainnet"
echo "4. Check transaction status on Safe app"
```

**Issue: "Transaction stuck pending"**
```bash
# Có thể do:
# 1. Chưa đủ signatures (cần 3/5)
# 2. Gas price quá thấp
# 3. Network congestion

# Check pending transactions
npx hardhat run scripts/check-pending-multisig-txs.js --network mainnet

# Manually execute if enough signatures
npx hardhat run scripts/execute-multisig-tx.js --network mainnet --tx-hash 0x...
```

**Issue: "Mất access vào Safe"**
```bash
# Emergency recovery:
echo "💡 Recovery options:"
echo "1. Use different signer wallet (if you have multiple)"
echo "2. Contact other signers to add your new wallet"
echo "3. Use Safe mobile app with seed phrase"
echo "4. Check MULTISIG_RECOVERY.md document"
```

### 8.2 Common Deploy Issues

**Issue: "insufficient funds for intrinsic transaction cost"**
```bash
# Solution: Add more ETH to deployer wallet
npx hardhat run scripts/check-balance.js --network <NETWORK>
```

**Issue: "contract verification failed"**
```bash
# Solution: Check constructor parameters match deployment
npx hardhat verify --show-stack-traces --network <NETWORK> <ADDRESS> [CONSTRUCTOR_ARGS]
```

**Issue: "nonce too low"**
```bash
# Solution: Reset nonce in MetaMask or wait for network sync
```

### 7.2 Gas Optimization

**High Gas Fees:**
```bash
# Check current gas prices
npx hardhat run scripts/check-gas-price.js --network mainnet

# Deploy during low congestion (weekends, early morning UTC)
# Use gas price limit
npx hardhat deploy --network mainnet --gasprice 20000000000  # 20 gwei
```

### 7.3 Network Issues

**RPC Endpoint Problems:**
```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $SEPOLIA_URL
```

---

## 📋 IX. POST-DEPLOYMENT TASKS

### 9.1 Documentation Updates

- [ ] Update README.md với deployment addresses
- [ ] Update frontend config với contract addresses  
- [ ] **📝 Tạo MULTISIG_PLAYBOOK.md** với hướng dẫn sử dụng Safe
- [ ] Document emergency procedures cho team
- [ ] Tạo user guides với contract addresses mới

### 9.2 Monitoring Setup

- [ ] Setup Etherscan alerts cho large transactions
- [ ] **🔔 Setup Gnosis Safe notifications** cho pending transactions
- [ ] Monitor multisig activity và approval patterns
- [ ] Track deposit/withdrawal volumes
- [ ] Setup admin notifications cho pause events

### 9.3 Team Training

- [ ] **🎓 Training session về Multisig operations**
- [ ] Test emergency procedures với dry-run
- [ ] Document contact information cho all signers
- [ ] Create escalation procedures
- [ ] Practice multisig workflows

### 9.4 Community Communication

- [ ] Announce deployment addresses
- [ ] **🏛️ Publish multisig address** cho transparency  
- [ ] Publish audit reports  
- [ ] Document governance procedures
- [ ] Setup user support channels

---

## 📞 SUPPORT & RESOURCES

**Documentation:**
- [README.md](../README.md) - Project overview
- [SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md) - Security features  
- [SPEC.md](./SPEC.md) - Technical specification
- **[MULTISIG_PLAYBOOK.md](./MULTISIG_PLAYBOOK.md)** - Multisig operations guide

**Multisig Tools:**
- Gnosis Safe Web: https://app.safe.global
- Safe Mobile App: iOS/Android stores
- Safe CLI: `npm install -g @gnosis.pm/safe-cli`

**Scripts:**
- Multisig Checker: `npx hardhat run scripts/check-multisig.js --network mainnet`
- Pending Proposals: `npx hardhat run scripts/multisig-pending.js --network mainnet`
- Emergency Pause: `npx hardhat run scripts/emergency-pause-propose.js --network mainnet`

**Block Explorers:**  
- Sepolia: https://sepolia.etherscan.io
- Mainnet: https://etherscan.io
- **Safe Transaction Service:** https://safe-transaction-mainnet.safe.global/

---

*Document Version: 2.0 - Multisig Enhanced*  
*Last Updated: January 30, 2026*  
*Status: Production Ready with Multisig*