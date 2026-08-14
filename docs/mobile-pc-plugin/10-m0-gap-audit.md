# M0 Gap Audit

> 目标：对照 `AGENTS.md`、`08-mobile-pc-plugin-constitution.md`、`09-marketplace-ready-plugin-analysis.md`，盘点 DSH Mobile-PC Plugin 从当前状态到“可进入 M1 Core MVP Freeze / 后续商城成熟化”的具体缺失项。

## 1. 当前状态

当前仓库只有项目宪法和分析文档：

```text
AGENTS.md
docs/mobile-pc-plugin/README.md
docs/mobile-pc-plugin/README.md
docs/mobile-pc-plugin/08-mobile-pc-plugin-constitution.md
docs/mobile-pc-plugin/09-marketplace-ready-plugin-analysis.md
```

当前没有：

- 插件源码。
- DSH 插件 manifest。
- mobile bridge transport 实现。
- policy/approval 实现。
- mobile UI surface。
- DeepSeek provider adapter。
- token usage observer。
- artifact storage adapter。
- 测试工程。
- CI/CD。
- 发布包、签名、SBOM、provenance。
- 插件商城审核材料。

因此 M0 结论是：

```text
方向和规则已建立。
工程资产尚未建立。
商城成熟化能力尚未开始实现。
```

## 1.1 Progress Update

2026-08-14:

- `GAP-005` 已部分补齐：已建立 ADR 目录、索引和模板。
- `GAP-001` 已有 ADR 草案：`ADR-0001-mvp-plugin-package-boundary.md`。
- `GAP-002` 已有 ADR 草案：`ADR-0002-dsh-version-compatibility-target.md`。
- `GAP-003` 已有 ADR 草案：`ADR-0003-marketplace-index-target.md`。
- `GAP-007` 到 `GAP-012` 已有 ADR 草案：`ADR-0004-engineering-skeleton-and-mock-host.md`。

2026-08-14 later update:

- `ADR-0001` 到 `ADR-0004` 已经专家审查并升为 `Accepted`。
- `ADR-0002` 的接受范围仅限兼容策略；真实 DSH 版本兼容仍需 spike，不能据此开始真实 DSH 集成。
- 已开始按 `ADR-0004` 创建 TypeScript monorepo、mock host、协议包、MVP 插件包占位和测试目录。
- 已通过 corepack 启动 pnpm，并完成依赖安装、lockfile 生成、git 初始化和基础验证。
- 验证通过：`pnpm verify`、`pnpm test:e2e`、`pnpm preflight:marketplace`。
- 注意：真实 DSH 集成、真实 LAN 控制面、真实 shell、任意文件系统访问、真实 DeepSeek API 调用仍被阻断。

## 2. 优先级定义

| Priority | Meaning |
| --- | --- |
| P0 | 阻塞 M1 或违反根宪法；不补无法开始核心 MVP。 |
| P1 | 阻塞 M2/M3；不补无法进入安全硬化或发布工程化。 |
| P2 | 阻塞 M4/M5；不补无法进入服务级 Beta 或商城 RC。 |
| P3 | GA 前需要补齐，但不阻塞早期验证。 |

## 3. M0 退出标准

M0 结束时至少应完成：

1. 明确 MVP 插件包边界。
2. 明确目标 DSH 版本和插件 API 兼容范围。
3. 明确目标商城/索引形态：官方商城、社区 dsh-index、私有 marketplace，或先做 mock marketplace。
4. 完成 manifest 草案。
5. 完成协议 schema 草案清单。
6. 完成安全 threat model 草案。
7. 完成测试矩阵草案。
8. 完成 M1 开发 backlog。
9. 明确哪些项延期到 Beta/GA，避免把 relay/SaaS/计费塞进 MVP。

## 4. 具体缺失项

### 4.1 项目边界与治理

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-001 | 缺少明确的 MVP 插件包拆分。 | P0 | M1 | 包边界表：transport、policy、ui、provider、observer、storage 各自仓库/目录/职责。 |
| GAP-002 | 缺少 DSH 目标版本范围。 | P0 | M1 | `minDshVersion`、`maxTestedDshVersion`、本地验证的 DSH 版本记录。 |
| GAP-003 | 缺少目标插件商城/索引选择。 | P0 | M1 | 选择官方商城、社区 dsh-index、私有 marketplace 或 mock marketplace 的 ADR。 |
| GAP-004 | 缺少 marketplace 上架规则来源。 | P0 | M3 | 官方/社区规则链接、审核字段清单、发布流程说明。 |
| GAP-005 | 缺少 ADR 目录和模板。 | P0 | M1 | `docs/.../adr/` 目录、ADR 模板、首批 ADR 列表。 |
| GAP-006 | 缺少 owner/role 分工。 | P1 | M1 | 产品、架构、安全、PC、移动、QA、发布、支持 owner 表。 |

### 4.2 仓库与工程骨架

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-007 | 当前目录不是 git 仓库。 | P0 | M1 | 初始化仓库或迁入真实仓库；建立分支策略。 |
| GAP-008 | 缺少 package/workspace 管理方案。 | P0 | M1 | monorepo 结构、package manager、lockfile、workspace 配置。 |
| GAP-009 | 缺少语言/框架选型。 | P0 | M1 | TypeScript/Node、移动 Web/App 形态、测试框架 ADR。 |
| GAP-010 | 缺少基础 lint/typecheck/test 命令。 | P1 | M2 | `lint`、`typecheck`、`test`、`test:contract`、`test:security` 命令。 |
| GAP-011 | 缺少本地 dev bootstrap。 | P1 | M1 | 一条命令启动 PC mock host + mobile surface。 |
| GAP-012 | 缺少 mock DSH host。 | P0 | M1 | 可模拟 DSH runtime/event/artifact/policy 的本地 fixture。 |

### 4.3 插件 Manifest 与商城元数据

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-013 | 缺少 `dsh-mobile-bridge.transport` manifest。 | P0 | M1 | `plugin.manifest.json` 草案和 schema 校验。 |
| GAP-014 | 缺少 `dsh-mobile-approval.policy` manifest。 | P0 | M1 | policy 插件 manifest。 |
| GAP-015 | 缺少 `dsh-mobile-surface.ui` manifest。 | P0 | M1 | mobile UI surface manifest。 |
| GAP-016 | 缺少 `dsh-token-usage.observer` manifest。 | P1 | M2 | observer manifest。 |
| GAP-017 | 缺少 `dsh-local-artifact.storage` manifest。 | P1 | M2 | storage manifest。 |
| GAP-018 | 缺少 DeepSeek provider 插件策略。 | P0 | M1 | 复用上游 provider 还是自建 adapter 的 ADR。 |
| GAP-019 | 缺少权限最小化清单。 | P0 | M1 | 每个插件的 required/optional permissions 和风险等级。 |
| GAP-020 | 缺少插件依赖图。 | P1 | M1 | 插件依赖、加载顺序、optional fallback。 |
| GAP-021 | 缺少 marketplace listing 文案。 | P3 | M5 | 名称、描述、截图、权限解释、隐私说明、支持入口。 |

### 4.4 核心协议与 Schema

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-022 | 缺少正式 protocol version 定义。 | P0 | M1 | `protocolVersion`、major/minor 规则、兼容策略。 |
| GAP-023 | 缺少 RPC envelope JSON Schema。 | P0 | M1 | schema 文件和 contract tests。 |
| GAP-024 | 缺少 event envelope JSON Schema。 | P0 | M1 | schema 文件、sequence/resume 规则。 |
| GAP-025 | 缺少 task intent schema。 | P0 | M1 | 手机提交任务的最小字段、禁止字段、错误模型。 |
| GAP-026 | 缺少 approval request/decision schema。 | P0 | M1 | action digest、risk、scope、ttl、signature schema。 |
| GAP-027 | 缺少 artifact reference schema。 | P1 | M2 | visibility、redaction、digest、download policy。 |
| GAP-028 | 缺少 error code taxonomy。 | P1 | M2 | 认证、权限、协议、恢复、provider、transport 错误码。 |
| GAP-029 | 缺少 capability negotiation schema。 | P1 | M2 | host/plugin/mobile/transport/provider capability 握手协议。 |
| GAP-030 | 缺少 lease schema。 | P0 | M1 | TTL、max-use、scope、principal、revocation 字段。 |
| GAP-031 | 缺少 redaction metadata schema。 | P1 | M2 | redaction policy、sensitive flag、safe-for-mobile 标记。 |

### 4.5 配对、认证与会话

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-032 | 缺少 pairing flow ADR。 | P0 | M1 | LAN QR 配对完整时序图和失败路径。 |
| GAP-033 | 缺少 pairing token 生成/过期/撤销规则。 | P0 | M1 | TTL、一次性、熵要求、重放拒绝规则。 |
| GAP-034 | 缺少 device identity 模型。 | P0 | M1 | device keypair、device_id、trust level、撤销规则。 |
| GAP-035 | 缺少 session authentication 方案。 | P0 | M1 | challenge-response、nonce、seq、signature 规则。 |
| GAP-036 | 缺少 session lifecycle。 | P1 | M2 | open、refresh、expire、revoke、resume、close。 |
| GAP-037 | 缺少 trust level 管理界面要求。 | P1 | M2 | viewer/operator/approver/admin 授权和降级流程。 |
| GAP-038 | 缺少 PC-admin 操作定义。 | P0 | M1 | 谁可以启用 LAN、配对设备、撤销设备、开启 relay。 |

### 4.6 Transport 与 Relay

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-039 | 缺少 LAN transport ADR。 | P0 | M1 | WebSocket/HTTPS/SSE 选择、端口、绑定地址、TLS 策略。 |
| GAP-040 | 缺少默认监听策略实现方案。 | P0 | M1 | 不默认监听 `0.0.0.0`，显式授权 LAN 暴露。 |
| GAP-041 | 缺少 event resume 机制。 | P0 | M1 | seq、ack、resume token、gap handling。 |
| GAP-042 | 缺少 backpressure 策略。 | P1 | M2 | 移动端慢消费、event flood、日志限速。 |
| GAP-043 | 缺少 relay 是否纳入 Beta 的 ADR。 | P2 | M4 | relay 延期/引入决策、风险评估。 |
| GAP-044 | 缺少 relay E2E encryption 方案。 | P2 | M4 | 端到端密钥协商、前向安全、密钥轮换。 |
| GAP-045 | 缺少 relay 租户隔离与限流方案。 | P2 | M4 | tenant/account/device/run 维度隔离和限流。 |

### 4.7 Policy、权限与沙箱

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-046 | 缺少 policy engine 接口定义落地文件。 | P0 | M1 | allow/deny/ask 输出 schema 和 adapter。 |
| GAP-047 | 缺少 high-risk capability 列表实现。 | P0 | M1 | shell、fs write、external read、full artifact、relay enable 等规则。 |
| GAP-048 | 缺少 approval digest 计算规范。 | P0 | M1 | command/path/url/input canonicalization 和 sha256 规则。 |
| GAP-049 | 缺少 lease enforcement 实现方案。 | P0 | M1 | TTL/max-use/scope/principal/action digest 检查点。 |
| GAP-050 | 缺少 DSH sandbox 对接策略。 | P0 | M1 | 复用 DSH fs/bash sandbox 的接口和 fallback。 |
| GAP-051 | 缺少 workspace boundary 策略。 | P1 | M2 | path resolve、symlink、hardlink、case sensitivity、external mount。 |
| GAP-052 | 缺少 shell env secret stripping 方案。 | P1 | M2 | KEY/TOKEN/SECRET/PASSWORD 等环境变量剥离和测试。 |
| GAP-053 | 缺少 permission denial UX/事件规范。 | P1 | M2 | 用户可理解错误文案和 audit event。 |

### 4.8 Secret、隐私与脱敏

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-054 | 缺少 PC-side secret store 对接方案。 | P0 | M1 | 复用 DSH credentials 或 OS keychain 的决策。 |
| GAP-055 | 缺少 mobile zero-secret 验证机制。 | P0 | M2 | mobile localStorage/cache/crash report 扫描。 |
| GAP-056 | 缺少 redaction allowlist/denylist 策略。 | P0 | M2 | 日志、event、artifact、diagnostic、crash report 脱敏规则。 |
| GAP-057 | 缺少 canary secret 测试集。 | P1 | M2 | 假 token/路径/邮箱/手机号/SSH key 注入和泄露检测。 |
| GAP-058 | 缺少隐私数据分类。 | P1 | M3 | account/device/session/run/approval/artifact/telemetry 数据分类。 |
| GAP-059 | 缺少数据保留与删除策略。 | P2 | M4 | 本地缓存、relay metadata、diagnostic bundle、audit log 保留周期。 |

### 4.9 PC 端能力

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-060 | 缺少 PC bridge 插件实现。 | P0 | M1 | transport start/stop、pairing、session、event subscribe。 |
| GAP-061 | 缺少 PC device management。 | P1 | M2 | 绑定设备列表、trust level、撤销、最近 session。 |
| GAP-062 | 缺少 PC approval audit。 | P1 | M2 | 最近审批、拒绝、超时、lease 使用记录。 |
| GAP-063 | 缺少 PC health check。 | P1 | M3 | bridge、policy、runtime、provider、artifact store 状态。 |
| GAP-064 | 缺少 PC local artifact store adapter。 | P1 | M2 | artifact index、summary、digest、visibility。 |
| GAP-065 | 缺少 PC interrupted run handling。 | P1 | M2 | worker crash、PC restart、sleep/wake 状态恢复。 |

### 4.10 移动端 Surface

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-066 | 缺少移动端形态决策。 | P0 | M1 | mobile web、PWA、native app、WebView shell 的 ADR。 |
| GAP-067 | 缺少 QR pairing UI。 | P0 | M1 | 扫码/输入短码、过期、失败、重试流程。 |
| GAP-068 | 缺少 task submit UI。 | P0 | M1 | intent 表单、profile/model 展示、权限摘要。 |
| GAP-069 | 缺少 approval UI。 | P0 | M1 | action preview、digest、risk、scope、ttl、approve/deny。 |
| GAP-070 | 缺少 live event/log UI。 | P1 | M2 | redacted event stream、过滤、断线提示、resume。 |
| GAP-071 | 缺少 result summary UI。 | P1 | M2 | artifact reference、summary、full access request。 |
| GAP-072 | 缺少移动端安全存储策略。 | P1 | M2 | device private key 存储、平台差异、清除策略。 |
| GAP-073 | 缺少移动端后台/冷启动恢复设计。 | P1 | M2 | iOS/Android/WebView lifecycle 测试路径。 |

### 4.11 DeepSeek Provider 与 Token Observer

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-074 | 缺少 provider 复用策略。 | P0 | M1 | 复用上游 DeepSeek provider，还是独立 provider 插件。 |
| GAP-075 | 缺少 provider usage 字段映射。 | P1 | M2 | prompt/completion/reasoning/cache read/write 字段来源。 |
| GAP-076 | 缺少 token/cache 指标真实性规则实现。 | P1 | M2 | unavailable/estimated/provider_reported 分类。 |
| GAP-077 | 缺少 pricing metadata 策略。 | P2 | M3 | pricing version、currency、cache discount、estimate 标记。 |
| GAP-078 | 缺少移动端 usage 展示策略。 | P2 | M3 | 摘要可见，不泄露 prompt/code。 |

### 4.12 Artifact、事件与审计

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-079 | 缺少 append-only event store 实现。 | P0 | M1 | event persistence、seq、correction event。 |
| GAP-080 | 缺少 audit event catalog。 | P0 | M1 | pairing/session/task/approval/policy/artifact/security 事件表。 |
| GAP-081 | 缺少 artifact visibility policy。 | P1 | M2 | mobile_summary、mobile_redacted、pc_only、approval_required。 |
| GAP-082 | 缺少 artifact full access flow。 | P2 | M3 | 手机请求完整 artifact 的审批流程。 |
| GAP-083 | 缺少 diagnostic bundle 规范。 | P1 | M3 | allowlist 字段、脱敏、导出、用户授权。 |

### 4.13 测试与认证

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-084 | 缺少测试框架。 | P0 | M1 | unit/contract/security/e2e 工具选型和脚本。 |
| GAP-085 | 缺少 manifest schema tests。 | P0 | M1 | strict schema、非法权限、未知字段、重复 ID。 |
| GAP-086 | 缺少 protocol contract tests。 | P0 | M1 | RPC/event/task/approval/artifact schema。 |
| GAP-087 | 缺少 security tests。 | P0 | M2 | replay、secret、approval digest、permission bypass、Origin/CSRF。 |
| GAP-088 | 缺少 recovery tests。 | P1 | M2 | mobile disconnect、PC restart、worker crash、approval timeout。 |
| GAP-089 | 缺少 mobile E2E tests。 | P1 | M2 | pairing、submit、approval、logs、summary、cancel。 |
| GAP-090 | 缺少 privacy redaction tests。 | P1 | M2 | canary secret、diagnostic、crash、mobile storage。 |
| GAP-091 | 缺少 performance baseline。 | P2 | M3 | pairing latency、event p95/p99、approval roundtrip、large logs。 |
| GAP-092 | 缺少 marketplace preflight。 | P1 | M3 | 上架前自动审核脚本。 |

### 4.14 发布、供应链与商城材料

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-093 | 缺少 CI/CD。 | P1 | M2 | lint/typecheck/test/package/sign/preflight pipeline。 |
| GAP-094 | 缺少插件打包格式。 | P1 | M3 | package layout、bundle、assets、manifest placement。 |
| GAP-095 | 缺少签名方案。 | P1 | M3 | signing key custody、signature format、verification logic。 |
| GAP-096 | 缺少 checksum 生成与校验。 | P1 | M3 | package digest、manifest digest。 |
| GAP-097 | 缺少 SBOM 生成。 | P1 | M3 | CycloneDX/SPDX 输出和扫描。 |
| GAP-098 | 缺少 provenance。 | P1 | M3 | source commit、builder、lockfile、build command、artifact digest。 |
| GAP-099 | 缺少依赖漏洞与 license 扫描。 | P1 | M3 | CVE、malicious package、license gate。 |
| GAP-100 | 缺少灰度和回滚策略。 | P2 | M4 | internal/canary/stable/emergency channel。 |
| GAP-101 | 缺少插件吊销机制。 | P2 | M4 | revocation list、离线策略、安全公告。 |

### 4.15 文档、支持与合规

| ID | 缺失项 | Priority | 阻塞阶段 | 需要补齐的证据/产物 |
| --- | --- | --- | --- | --- |
| GAP-102 | 缺少用户安装文档。 | P2 | M5 | 安装、启用、配对、撤销、故障排查。 |
| GAP-103 | 缺少权限说明文档。 | P1 | M3 | 每个权限为什么需要、何时触发、如何拒绝。 |
| GAP-104 | 缺少隐私说明。 | P1 | M3 | 收集项、用途、保留周期、是否上传、如何关闭。 |
| GAP-105 | 缺少安全联系人和漏洞响应流程。 | P2 | M5 | security policy、SLA、公告模板。 |
| GAP-106 | 缺少支持矩阵。 | P2 | M5 | DSH 版本、OS、mobile browser/app、network。 |
| GAP-107 | 缺少已知限制。 | P2 | M5 | MVP 不支持 relay、多 PC、移动编辑、任意远程 shell。 |

## 5. M0 必须优先解决的 P0 清单

M1 开发前必须先补：

1. GAP-001：MVP 插件包拆分。
2. GAP-002：DSH 目标版本范围。
3. GAP-003：目标商城/索引选择。
4. GAP-005：ADR 目录和模板。
5. GAP-007：git 仓库或真实工程仓库。
6. GAP-008：workspace/package 管理方案。
7. GAP-009：语言/框架选型。
8. GAP-012：mock DSH host。
9. GAP-013 到 GAP-015：MVP 三个核心 manifest。
10. GAP-018：DeepSeek provider 策略。
11. GAP-019：权限最小化清单。
12. GAP-022 到 GAP-026、GAP-030：核心协议 schema。
13. GAP-032 到 GAP-035、GAP-038：配对和 session 安全设计。
14. GAP-039 到 GAP-041：LAN transport 和事件恢复。
15. GAP-046 到 GAP-050：policy、approval digest、lease、sandbox。
16. GAP-054：PC-side secret store 策略。
17. GAP-060：PC bridge 插件实现。
18. GAP-066 到 GAP-069：移动端 MVP UI 决策和关键界面。
19. GAP-074：provider 复用策略。
20. GAP-079 到 GAP-080：event store 和 audit catalog。
21. GAP-084 到 GAP-086：测试框架和 contract tests。

## 6. 建议的 M1 Backlog

按最小可验证闭环排序：

| Order | Work Item | Covers |
| --- | --- | --- |
| 1 | 建立 monorepo/workspace 工程骨架 | GAP-007, GAP-008, GAP-009 |
| 2 | 建立 ADR 目录和模板 | GAP-005 |
| 3 | 编写 MVP 插件包边界 ADR | GAP-001 |
| 4 | 编写 DSH 版本兼容 ADR | GAP-002 |
| 5 | 编写 marketplace/index 目标 ADR | GAP-003 |
| 6 | 实现 mock DSH host | GAP-012 |
| 7 | 编写核心 manifest schema 和三个 MVP manifest | GAP-013, GAP-014, GAP-015, GAP-019 |
| 8 | 编写核心协议 schema | GAP-022 到 GAP-030 |
| 9 | 编写 pairing/session ADR 和 contract tests | GAP-032 到 GAP-035 |
| 10 | 编写 LAN transport ADR 和 mock transport | GAP-039 到 GAP-041 |
| 11 | 编写 policy/lease/approval digest ADR | GAP-046 到 GAP-049 |
| 12 | 实现最小 PC bridge + mobile mock surface | GAP-060, GAP-066 到 GAP-069 |
| 13 | 实现 append-only event store | GAP-079, GAP-080 |
| 14 | 跑通 MVP E2E：pair -> submit -> event -> approval -> artifact summary | GAP-084 到 GAP-086 |

## 7. 当前应延期的事项

以下不要进入 M1：

- Relay 公网服务。
- 账号/租户体系。
- 企业 SSO。
- 商业计费。
- 多 PC 编排。
- 移动端代码编辑。
- full artifact 云存储。
- 云端日志检索。
- 自动更新通道。
- 插件吊销线上服务。

这些是 M4/M5 之后的能力。提前做会扩大攻击面和审核面。

## 8. 外部待确认

| ID | 问题 | 影响 |
| --- | --- | --- |
| EXT-001 | 目标插件商城是官方、dsh-index、私有，还是先 mock？ | manifest、签名、发布流程。 |
| EXT-002 | 官方 DSH 插件 API 是否稳定？ | 兼容范围、接口版本、adapter 策略。 |
| EXT-003 | 商城是否要求签名/SBOM/provenance？ | M3 发布门禁。 |
| EXT-004 | 商城是否允许插件依赖外部 relay 服务？ | M4 relay 设计和隐私合规。 |
| EXT-005 | 商城是否允许移动端 surface 独立分发？ | mobile web/app 打包和审核路径。 |
| EXT-006 | DeepSeek provider usage/cache 字段是否稳定？ | token/cache observer 真实性。 |
| EXT-007 | DSH sandbox 扩展点是否可供插件直接复用？ | tool/policy/sandbox 接入复杂度。 |

## 9. M0 结论

当前项目可进入 M0，但还不能进入 M1 实现。

原因：

- 缺少工程仓库和源码骨架。
- 缺少 MVP 插件包边界。
- 缺少目标 DSH 版本和 marketplace 目标。
- 缺少 manifest/schema/test 基础。
- 缺少安全 ADR。

下一步应先完成 P0 清单中的文档和工程骨架，尤其是：

```text
ADR template
MVP package boundary
DSH compatibility target
marketplace target
manifest schema
core protocol schemas
pairing/session ADR
policy/lease ADR
mock DSH host
contract test harness
```

这些完成后，才能进入 M1 Core MVP Freeze。
