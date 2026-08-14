# Marketplace-Ready Plugin Analysis

> 目标：分析 DSH Mobile-PC Plugin 要成为可接入 DeepSeek Harness 插件商城、可对外服务、可持续维护的成熟插件，需要补齐的能力、门禁和路线。

## 1. 结论

当前项目已经有正确的产品边界和安全宪法：

```text
Mobile side = intent submission, approval, status, logs, result summary
PC side = DSH runtime, tools, sandbox, DeepSeek provider, secrets, artifacts
Plugin layer = pairing, authenticated transport, policy, event stream, mobile UI surface
```

但这只够定义方向。要成为能上架插件商城的成熟插件，需要从“安全 MVP”升级为“可审核、可分发、可更新、可回滚、可监控、可支持”的插件产品。

成熟插件至少要满足：

1. 插件边界清晰：所有能力都由 manifest、capability、permission、policy 声明。
2. 供应链可信：签名包、checksum、SBOM、provenance、许可证和变更日志齐全。
3. 安全可审计：配对、认证、重放保护、approval digest、lease、sandbox、secret redaction 全部自动验证。
4. 协议可演进：manifest、RPC、event、approval、artifact schema 有版本策略和兼容矩阵。
5. 服务可运营：如果提供 relay，必须有 E2E 加密、租户隔离、限流、监控、告警、SLA、漏洞响应。
6. 商城可审核：自动化认证报告能证明权限最小化、移动端零 secret、所有高风险动作受 policy 控制。

## 2. 外部生态事实

DSH 官方产品定位是 "Everything is a plugin"，插件覆盖 models、tools、skills、sessions、sandboxes、storage、loops、scheduling 和 UI，并强调每次运行都有 append-only trace。参考官方介绍：<https://www.deepseek.com/harness/en/>

社区侧已经出现 dsh-index 这类插件/Agent 索引，包含插件包、Agent 包、安装命令、分类、版本和分发状态。参考 dsh-index：<https://dsh-index.xlings.org/>

这意味着本项目如果要“能接入插件商城”，不能只做一个内部工具；它必须具备公开插件生态所需要的元数据、审核材料、兼容策略和支持流程。

## 3. 专家会审结论

| 专家视角 | 关键结论 |
| --- | --- |
| 任务分析 | 分阶段推进：MVP 固化、安全硬化、发布工程化、服务级 Beta、商城 RC、GA。 |
| AI/插件集成 | 需要标准 manifest、capability negotiation、provider/tool/policy/transport typed contracts、token/cost/cache observer。 |
| 后端/服务架构 | Relay 是可选增强，不是执行层；若做 relay，必须 E2E 加密、租户隔离、限流、审计和 SLA。 |
| 安全发布/DevOps | 上架需要签名、SBOM、provenance、灰度、回滚、监控、漏洞响应、供应链扫描。 |
| 测试认证 | 商城审核重点是 manifest/schema、协议兼容、安全、权限沙箱、配对认证、断线恢复、隐私脱敏和移动端 E2E。 |

## 4. 成熟插件能力清单

### 4.1 插件商城接入能力

必须具备：

- 标准 plugin manifest。
- 插件 ID、名称、描述、发布者、支持入口。
- `manifestVersion`、`pluginVersion`、`apiVersion`、`protocolVersion`。
- `minDshVersion`、`maxTestedDshVersion`。
- 插件类型和贡献点：transport、policy、ui、provider、observer、storage。
- 权限清单和风险等级。
- 依赖插件和可选插件。
- 许可证。
- changelog。
- README 和用户安装说明。
- 威胁模型摘要。
- 隐私说明。
- 测试报告。
- checksum。
- 签名。
- SBOM。
- provenance。

建议 manifest 至少包含：

```json
{
  "id": "dsh-mobile-bridge.transport",
  "displayName": "DSH Mobile Bridge",
  "publisher": "your-org",
  "type": "transport",
  "manifestVersion": "1.0.0",
  "pluginVersion": "1.0.0",
  "apiVersion": "1.0",
  "protocolVersion": "1.0",
  "minDshVersion": "1.0.0",
  "maxTestedDshVersion": "1.2.x",
  "capabilities": [
    "mobile.pairing",
    "mobile.session",
    "task.submit",
    "approval.request",
    "event.stream.redacted"
  ],
  "permissions": {
    "network.listen": ["127.0.0.1", "lan"],
    "network.connect": [],
    "secrets.read": [],
    "secrets.write": [],
    "artifact.read": ["summary"]
  },
  "artifacts": {
    "defaultVisibility": "mobile_summary"
  },
  "supplyChain": {
    "signature": "required",
    "sbom": "required",
    "provenance": "required"
  }
}
```

### 4.2 插件协议成熟度

需要稳定以下 contract：

- Pairing schema。
- Session authentication schema。
- Task intent schema。
- Approval request/decision schema。
- Event envelope schema。
- Artifact reference schema。
- Error model。
- Protocol version negotiation。
- Capability negotiation。
- Lease format。
- Redaction metadata。

规则：

- major 不同默认不兼容。
- minor 只能新增可选字段。
- 删除、重命名、语义改变必须升 major。
- 插件启动时必须做 runtime capability check。
- 不满足兼容矩阵时拒绝加载，而不是部分运行。

### 4.3 权限与安全成熟度

必须证明：

- 手机端没有 raw secret。
- 手机端没有 raw filesystem capability。
- 手机端没有 raw shell capability。
- 所有 transport 都认证。
- pairing token 短 TTL、一次性、可撤销。
- session 有 challenge-response、nonce、seq、replay protection。
- approval 绑定 exact action digest。
- 高风险动作使用 scoped lease，含 TTL、max-use、principal、workspace、run ID。
- shell、文件写入、full artifact、external file read、relay enable 都经过 policy。
- 日志、event、artifact、diagnostic、crash report 全链路脱敏。

### 4.4 服务化能力

LAN-first 是 MVP 正确方向；对外服务级成熟插件可以增加 relay，但 relay 必须是独立高风险能力。

Relay 必须满足：

- Relay 只转发密文 envelope。
- Relay 不持有内容解密密钥。
- Relay 不可读取 prompt、代码、日志正文、artifact 正文、API Key。
- Relay 不可伪造 PC 或 mobile。
- Relay metadata 最小化。
- Relay enable 只能由 PC-admin 授权。
- 支持设备撤销、密钥轮换、重放保护、限流和租户隔离。

服务侧需要：

- 账号/设备绑定。
- tenant/account/device/workspace 隔离。
- 配额与限流。
- 审计日志。
- 状态同步游标。
- 连接健康检查。
- 可用性 SLO。
- 安全吊销列表。
- 数据保留与删除策略。

### 4.5 可观测性与诊断

必须提供：

- 配对成功率。
- session 认证失败率。
- replay 拒绝数。
- task submit 成功率。
- approval 超时率。
- event stream 延迟。
- disconnect/reconnect 次数。
- worker crash 次数。
- artifact summary 请求量。
- policy deny 次数。
- secret redaction 命中数。
- token usage。
- cache hit ratio，前提是 provider 真实返回或可信估算。

token/cache 规则：

- provider 不返回 usage 时标记 `unavailable`。
- tokenizer 估算必须标记 `estimated`。
- cache 数据不可伪造。
- 成本估算必须记录 pricing version 和是否估算。

## 5. 商城上架门禁

### 5.1 Ready 门禁

每个功能进入开发前必须有：

- 插件类型。
- manifest 权限声明。
- 协议 schema。
- policy 决策路径。
- 安全风险分级。
- 审计事件。
- 恢复语义。
- 测试清单。

### 5.2 Contract 门禁

必须通过：

- manifest strict schema。
- RPC envelope schema。
- event envelope schema。
- approval schema。
- artifact reference schema。
- error model。
- compatibility check。
- unknown field compatibility。
- feature flag compatibility。

### 5.3 Security 门禁

必须通过：

- 过期 QR token 无法配对。
- pairing token 只能使用一次。
- seq replay 被拒绝。
- 未配对设备无法提交任务。
- viewer 设备无法审批 shell。
- 手机端无法读取 secret。
- approval digest 被篡改后无法执行。
- 未声明网络 endpoint 被拒绝。
- shell env secret 被剥离。
- 日志和诊断包脱敏。
- mobile localStorage/cache/crash report 不含 secret。

### 5.4 Recovery 门禁

必须通过：

- 手机断线后按 seq 补事件。
- PC 重启后旧 session 失效。
- worker crash 后 run 标记 interrupted。
- approval timeout 后默认拒绝。
- transport failure 不影响 PC 本地 DSH run。
- artifact full access 重连后仍需重新过 policy。

### 5.5 Marketplace 包门禁

发布物必须包含：

- 插件包。
- manifest。
- checksum。
- 签名。
- SBOM。
- provenance。
- 测试报告。
- 权限清单。
- 威胁模型摘要。
- 隐私说明。
- 变更日志。
- 支持和安全联系人。

阻断发布：

- 未认证 LAN RPC。
- 默认监听 `0.0.0.0`。
- relay 明文转发内容。
- 移动端保存 API Key。
- 未脱敏日志流。
- 无签名自动更新。
- 权限声明与实际行为不一致。
- 插件包含可疑 postinstall 或未说明二进制 payload。

## 6. 发布与供应链

### 6.1 CI/CD 阶段

建议流水线：

```text
lint
-> typecheck
-> unit tests
-> contract tests
-> security tests
-> recovery tests
-> mobile e2e
-> package
-> sign
-> SBOM
-> provenance
-> marketplace preflight
-> canary
-> stable
```

### 6.2 签名与校验

插件安装前必须校验：

- publisher identity。
- package digest。
- manifest digest。
- signature。
- certificate chain。
- revocation status。
- SBOM digest。
- provenance digest。
- channel。
- permission delta。

权限扩大时不能静默升级，必须提示 PC-admin 或重新授权。

### 6.3 SBOM 与 Provenance

SBOM 应覆盖：

- npm dependencies。
- native binaries。
- mobile web/app dependencies。
- build tooling。
- relay service dependencies，若存在。

Provenance 应记录：

- source repository。
- commit。
- tag。
- build runner identity。
- lockfile digest。
- build command。
- artifact digest。
- signing identity。

中期目标建议对齐 SLSA 风格的受控构建和不可伪造 provenance。

### 6.4 灰度与回滚

必须支持：

- internal/canary/stable/emergency channel。
- 按 DSH host 版本灰度。
- 按 OS/architecture 灰度。
- 按 plugin version 灰度。
- 服务端停止分发问题版本。
- PC 端回滚到最近已验证版本。
- 策略和 schema 迁移失败时安全停用。

## 7. 服务 SLA 与运维

如果提供 relay 或账号设备服务，需要定义：

| 指标 | 建议目标 |
| --- | --- |
| 插件安装/更新服务可用性 | 99.9% |
| 签名/元数据服务可用性 | 99.95% |
| 吊销列表 RTO | <= 15 分钟 |
| 发布元数据 RTO | <= 1 小时 |
| 发布元数据 RPO | <= 15 分钟 |
| 移动事件流 P95 延迟 | < 2 秒 |
| 审批请求送达率 | > 99.5% |
| 插件更新成功率 | > 99% |

需要配套：

- on-call。
- 事故分级。
- 安全公告。
- 漏洞响应 SLA。
- 错误预算。
- 变更冻结。
- 事故复盘。

## 8. 测试认证矩阵

| 测试类型 | 必测内容 |
| --- | --- |
| Manifest | ID、版本、权限、依赖、兼容 DSH 范围、签名、SBOM、未知字段。 |
| Protocol | pairing、session、intent、approval、event、artifact、error、version negotiation。 |
| Security | replay、MITM、session fixation、CSRF/Origin、XSS、路径穿越、命令注入、secret scan。 |
| Permission | policy precedes capability、lease TTL/max-use/scope/principal/action digest。 |
| Sandbox | workspace boundary、symlink/hardlink、external path、secret env stripping。 |
| Relay | E2E encryption、metadata minimization、tenant isolation、DoS/rate limit、resume。 |
| Recovery | disconnect、mobile background、PC sleep/restart、worker crash、approval timeout。 |
| Performance | pairing latency、event p95/p99、approval roundtrip、large logs、long stream。 |
| Load | reconnect storm、event flood、slow consumer、8-24h soak、backpressure。 |
| Mobile E2E | QR pairing、submit task、approval、cancel、redacted logs、result summary、cold start restore。 |
| Privacy | canary secret、diagnostic allowlist、crash redaction、mobile storage inspection。 |
| Upgrade | old mobile/new PC、new mobile/old PC、rollback、schema migration、permission delta prompt。 |

## 9. 阶段路线

| 阶段 | 目标 | 关键产出 | 通过条件 |
| --- | --- | --- | --- |
| M0 Gap Audit | 对齐商城和当前宪法 | 审核清单、能力缺口、优先级 | 明确 MVP/Beta/GA 范围 |
| M1 Core MVP Freeze | LAN 配对、认证、任务、审批、事件、artifact 摘要闭环 | 6 个 MVP 插件跑通 | MVP E2E 全通过 |
| M2 Security Hardening | 安全规则自动门禁化 | threat model、security tests、secret scan | P0/P1 安全问题为 0 |
| M3 Release Engineering | 形成商城可提交包 | 签名包、checksum、SBOM、manifest、测试报告 | 安装/启用/升级/回滚可验证 |
| M4 Service Beta | 可靠性、诊断、可观测性 | health check、恢复测试、脱敏诊断包、SLO 指标 | 断线/重启/crash/超时场景通过 |
| M5 Marketplace RC | 外部审核候选 | RC 包、兼容矩阵、支持文档、审计报告 | 通过商城预审和内部发布评审 |
| M6 GA | 对外可用 | 正式版本、支持流程、漏洞响应流程 | 可灰度、可回滚、可持续支持 |

## 10. 当前不应进入首版的能力

不要进入 MVP：

- 公网 relay。
- 跨区域 relay。
- P2P 打洞。
- 完整 SaaS 账号体系。
- 企业 SSO/SAML/SCIM。
- 商业计费、发票、套餐。
- 多 PC 编排。
- 移动端代码编辑。
- 云端 artifact 存储。
- 云端日志全文检索。
- 移动端 DeepSeek credential 管理。
- 远程任意 shell。

这些能力会显著扩大安全、运维和审核面，应在 M4 之后按独立 ADR 和安全评审推进。

## 11. 需要尽快确认的外部输入

1. DeepSeek Harness 官方或目标插件商城的上架规范。
2. 插件签名和发布者身份机制。
3. manifest schema 的官方约束。
4. DSH 插件 API 的稳定版本范围。
5. 是否允许插件提供 relay 服务。
6. 商城是否强制 SBOM/provenance。
7. 移动端 surface 是否作为 DSH 插件分发，还是独立 Web/App 分发。
8. 商城审核是否接受外部服务依赖。
9. 隐私政策、数据保留、遥测默认策略要求。
10. 安全漏洞响应和吊销机制要求。

## 12. 建议的下一步

1. 新建 `ADR-MKT-001 Marketplace Packaging and Manifest`。
2. 新建 `ADR-MKT-002 Plugin Signing and Supply Chain Verification`。
3. 新建 `ADR-MKT-003 Marketplace Certification Test Matrix`。
4. 将 `08-mobile-pc-plugin-constitution.md` 中的 MVP 插件集拆为实际包边界。
5. 建立 marketplace preflight checklist。
6. 用 mock DSH marketplace index 做一次本地上架演练。
7. 等官方商城规则确认后，再固化 manifest schema 和发布流水线。
