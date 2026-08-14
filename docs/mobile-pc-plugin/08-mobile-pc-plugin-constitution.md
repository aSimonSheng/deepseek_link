# DSH Mobile-PC Plugin Development Constitution

> 目标：基于 "Everything is a plugin" 的思想，为 DeepSeek Harness（下称 DSH）设计一套手机端联动 PC 端的插件化开发宪法。本文是约束性工程文档，优先级高于普通方案说明。

> 归档状态：根目录 `AGENTS.md` 是当前最高层开发宪法；本文保留为详细规格归档，承载协议、接口、配对、权限沙箱、测试门禁等具体开发细节。若两者冲突，以 `AGENTS.md` 为准，并应同步修订本文。

## 0. 定位

### 0.1 产品定位

手机端联动 PC 的 DSH 插件不是一个新的移动 IDE，也不是把 DSH 全量搬到手机上运行。

它的定位是：

```text
手机端 = 远程控制面 + 审批面 + 状态查看面
PC 端 = DSH agent runtime + 工具执行面 + 凭据面 + 证据归档面
插件层 = 设备配对 + 安全传输 + 权限策略 + 事件同步 + UI surface
```

### 0.2 架构定位

DSH 的核心运行时、headless 能力、工具执行、沙箱和 canonical JSONL 证据必须继续留在 PC 端。手机端不得成为 agent runtime 的真实执行环境。

手机联动能力应作为 DSH 插件族接入：

```text
dsh-mobile-bridge.transport
dsh-mobile-pairing.auth
dsh-mobile-approval.policy
dsh-mobile-surface.ui
dsh-mobile-notification.observer
dsh-mobile-relay.transport     # 非 MVP，可选
```

### 0.3 适用范围

本文适用于：

- PC 端 DSH host/plugin 开发。
- 手机端 Web/App 控制面开发。
- 手机-PC 配对、认证、授权、事件同步。
- 手机发起任务、查看日志、审批工具调用、查看结果。
- 与 DeepSeek provider、工具插件、报告插件、存储插件的协作协议。

本文不定义：

- DeepSeek 官方 App 的内部实现。
- 公网账号体系和商业订阅系统。
- 完整移动端代码编辑器。
- 与上游 DSH 内核深度 fork 的私有协议。

## 1. 核心原则

### 1.1 小内核，强协议

DSH 内核只负责运行时调度、插件注册、权限决策、事件路由、artifact 归档和兼容性检查。

任何业务能力都必须通过插件贡献：

- DeepSeek provider 是插件。
- 手机桥接是插件。
- 工具调用是插件。
- 审批策略是插件。
- 传输通道是插件。
- UI surface 是插件。
- token 统计、缓存命中率、报告导出也是插件。

### 1.2 PC 是信任根

PC 端是唯一可信执行面：

- API Key 只存在于 PC 端凭据存储或 PC 端主进程内存。
- 文件系统、shell、浏览器、数据库、网络工具只在 PC 端执行。
- 手机端只能提交 intent、查看状态、授予或拒绝高风险动作。
- 手机端永远不能直接拿到 raw secret、raw filesystem capability 或 shell capability。

### 1.3 Headless 优先

手机联动插件不得破坏 DSH headless 运行能力。

任何可由手机触发的任务，都必须可以被 headless profile 通过等价输入复现。手机端只是一个 surface，不是新的不可复现执行路径。

### 1.4 传输可替换

手机-PC 联动必须抽象为 transport plugin：

- MVP 可以使用 LAN WebSocket/HTTPS。
- Beta 可以增加 relay。
- 后续可以增加 P2P、企业内网代理、二维码深链。

任务协议、权限协议、事件协议不得绑定某一种 transport。

### 1.5 权限先于能力

插件声明能力不代表插件获得能力。任何能力必须经过 policy plugin 授权。

高风险能力默认拒绝，至少包括：

- 写文件、删文件、改权限。
- 执行 shell 命令。
- 访问非 workspace 文件。
- 访问未声明网络域名。
- 安装、启用、升级插件。
- 修改凭据、导出诊断包。
- 开启公网 relay。

### 1.6 事件即证据

所有跨插件、跨设备、跨进程的重要动作都必须产生结构化事件。

事件必须能支撑：

- 失败归因。
- 审计追踪。
- 断线恢复。
- 任务回放。
- token/cost/cache 统计。
- 诊断包导出。

### 1.7 不做第 N 个薄壳

手机联动插件不得退化成“手机打开 PC localhost 页面”。

如果只是把未认证的本地 HTTP RPC 暴露给手机或局域网，那么安全模型比浏览器 localhost 更差，应被视为 P0 设计错误。

## 2. 术语

| 术语 | 定义 |
| --- | --- |
| Kernel | DSH 最小运行内核，负责插件生命周期、事件路由、权限调度和 artifact 存储。 |
| Host | PC 端承载 DSH 的运行环境，可以是 CLI/headless/desktop host。 |
| Surface | 用户交互面，包括桌面 UI、手机 Web UI、CLI、TUI。 |
| Plugin | 通过 manifest 和 typed interface 接入 DSH 的能力单元。 |
| Capability | 插件声明自己能提供或需要使用的能力。 |
| Permission | policy plugin 授予 capability 的具体授权。 |
| Lease | 有 TTL、作用域、撤销语义的临时授权。 |
| Principal | 触发动作的主体，例如 local_user、mobile_device、plugin、system。 |
| Device | 已配对的手机或 PC 端实例。 |
| Pairing | 设备首次建立信任关系的过程。 |
| Session | 设备配对后的一段已认证连接。 |
| Run | 一次 DSH agent/harness 任务执行。 |
| Tool Action | 文件、shell、浏览器、网络、数据库等外部副作用动作。 |
| Artifact | 运行日志、结果、截图、补丁、报告、trace 等可归档证据。 |

## 3. 总体架构

### 3.1 目标形态

```text
Mobile Surface
  - task form
  - approval view
  - live log view
  - result view
  - notification view

Transport Plugin
  - LAN WebSocket/HTTPS
  - optional relay
  - typed RPC envelope
  - event stream

PC Host
  - pairing service
  - session manager
  - policy engine
  - plugin registry
  - event bus
  - artifact store

DSH Runtime
  - agent loop
  - tool execution
  - sandbox backend
  - provider adapters
  - canonical JSONL logs
```

### 3.2 MVP 架构

MVP 只允许 LAN 模式：

```text
Mobile Browser/App
  -> QR pairing
  -> authenticated WebSocket
PC DSH Host
  -> mobile bridge plugin
  -> policy plugin
  -> DSH headless/runtime
```

MVP 不允许：

- 公网 relay。
- 手机直连未认证 localhost RPC。
- 手机保存 API Key。
- 手机执行 shell。
- 插件市场。
- 多用户共享 workspace。

### 3.3 Beta 架构

Beta 可以增加 relay，但 relay 必须满足：

- relay 只能转发加密 envelope。
- relay 不可解密 prompt、代码、日志正文、API Key。
- relay 不可伪造 PC 或手机身份。
- relay 事件必须有端到端序列号和重放保护。
- relay 可被关闭，LAN 模式必须仍可用。

## 4. 插件模型

### 4.1 Manifest 规范

每个插件必须声明 manifest。

```json
{
  "id": "dsh-mobile-bridge.transport",
  "type": "transport",
  "version": "0.1.0",
  "dsh": "^0.1.0",
  "entry": "./dist/index.js",
  "capabilities": [
    "mobile.pairing",
    "mobile.session",
    "event.stream",
    "task.submit",
    "approval.request"
  ],
  "permissions": {
    "network.listen": ["127.0.0.1", "lan"],
    "network.connect": [],
    "storage.read": ["mobile_devices", "sessions"],
    "storage.write": ["mobile_devices", "sessions"],
    "secrets.read": [],
    "secrets.write": []
  },
  "ui": {
    "surfaces": ["desktop.settings", "mobile.web"]
  }
}
```

Manifest 必须是静态可审计文件。运行时不得隐式申请 manifest 外能力。

### 4.2 基础插件接口

```ts
export type PluginType =
  | "provider"
  | "task"
  | "dataset"
  | "evaluator"
  | "tool"
  | "reporter"
  | "transport"
  | "storage"
  | "policy"
  | "observer"
  | "ui";

export interface HarnessPlugin {
  id: string;
  type: PluginType;
  version: string;
  manifest: PluginManifest;

  activate(ctx: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
  healthCheck?(): Promise<PluginHealth>;
  contribute?(): PluginContribution;
}
```

### 4.3 PluginContext 规范

插件不得直接访问全局对象获取特权能力。所有能力必须通过 `PluginContext` 获取。

```ts
export interface PluginContext {
  pluginId: string;
  dshVersion: string;

  events: EventBus;
  registry: PluginRegistry;
  permissions: PermissionBroker;
  artifacts: ArtifactStore;
  settings: SettingsStore;
  diagnostics: DiagnosticsSink;

  requestCapability<T extends Capability>(
    capability: T,
    reason: string
  ): Promise<CapabilityLease<T>>;
}
```

### 4.4 插件贡献

```ts
export interface PluginContribution {
  providers?: ProviderContribution[];
  tasks?: TaskContribution[];
  tools?: ToolContribution[];
  routes?: TransportRouteContribution[];
  uiPanels?: UiPanelContribution[];
  policies?: PolicyContribution[];
  observers?: ObserverContribution[];
}
```

插件只能贡献自己 manifest 声明过的能力。

## 5. 手机桥接插件接口

### 5.1 TransportPlugin

```ts
export interface TransportPlugin extends HarnessPlugin {
  type: "transport";

  start(listener: TransportListener): Promise<TransportHandle>;
  stop(): Promise<void>;

  createPairingOffer(req: PairingOfferRequest): Promise<PairingOffer>;
  acceptPairing(req: PairingAcceptRequest): Promise<PairingResult>;

  openSession(req: SessionOpenRequest): Promise<SessionHandle>;
  revokeDevice(deviceId: string): Promise<void>;
}
```

### 5.2 MobileBridgePlugin

```ts
export interface MobileBridgePlugin extends TransportPlugin {
  listDevices(): Promise<MobileDeviceInfo[]>;
  listSessions(): Promise<MobileSessionInfo[]>;

  submitTask(
    req: MobileTaskSubmitRequest,
    ctx: MobilePrincipalContext
  ): Promise<TaskAccepted>;

  approveAction(
    req: MobileApprovalDecision,
    ctx: MobilePrincipalContext
  ): Promise<ApprovalResult>;

  subscribeRunEvents(
    req: RunEventSubscribeRequest,
    ctx: MobilePrincipalContext
  ): AsyncIterable<HarnessEvent>;
}
```

### 5.3 ProviderPlugin

DeepSeek 不应写死在内核里。DeepSeek 是 provider plugin。

```ts
export interface ProviderPlugin extends HarnessPlugin {
  type: "provider";

  listModels(): Promise<ModelInfo[]>;
  getCapabilities(model: string): Promise<ModelCapabilities>;

  runChat(
    req: ProviderChatRequest,
    ctx: ProviderRunContext
  ): AsyncIterable<ProviderEvent>;

  estimateCost?(
    req: ProviderChatRequest,
    ctx: ProviderRunContext
  ): Promise<CostEstimate>;
}
```

Provider plugin 必须支持统一事件：

- `provider_request_started`
- `provider_stream_delta`
- `provider_usage_reported`
- `provider_error`
- `provider_request_completed`

### 5.4 ToolPlugin

```ts
export interface ToolPlugin extends HarnessPlugin {
  type: "tool";

  name: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  permissions: PermissionSpec;
  sideEffect: "none" | "read" | "write" | "execute" | "network";

  invoke(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}
```

Tool plugin 必须声明副作用等级。未声明副作用的 tool 一律按最高风险处理。

### 5.5 PolicyPlugin

```ts
export interface PolicyPlugin extends HarnessPlugin {
  type: "policy";

  evaluate(req: PolicyRequest): Promise<PolicyDecision>;
  explain?(decision: PolicyDecision): Promise<string>;
}
```

Policy 决策结果：

```ts
export type PolicyDecision =
  | { effect: "allow"; lease: CapabilityLeaseSpec }
  | { effect: "deny"; reason: string }
  | { effect: "ask"; approval: ApprovalRequestSpec };
```

### 5.6 ObserverPlugin

```ts
export interface ObserverPlugin extends HarnessPlugin {
  type: "observer";

  onEvent(event: HarnessEvent): Promise<void>;
  flush?(): Promise<void>;
}
```

Observer 可以做：

- token usage 统计。
- prompt cache 命中率统计。
- run duration 统计。
- tool 调用统计。
- 失败归因统计。
- 手机推送通知。

Observer 不得读取 raw secret。

## 6. 核心协议

### 6.1 协议版本

所有跨插件、跨设备消息必须携带协议版本。

```ts
export interface ProtocolVersion {
  name: "dsh-mobile-bridge";
  major: number;
  minor: number;
}
```

兼容规则：

- major 不同默认不兼容。
- minor 增加只能添加可选字段，不得改变既有字段语义。
- 废弃字段必须至少保留两个 minor 版本。

### 6.2 RPC Envelope

```json
{
  "protocol": { "name": "dsh-mobile-bridge", "major": 1, "minor": 0 },
  "message_id": "msg_01H...",
  "session_id": "sess_01H...",
  "device_id": "dev_01H...",
  "seq": 42,
  "timestamp": "2026-08-14T00:00:00.000Z",
  "method": "task.submit",
  "params": {},
  "auth": {
    "kind": "session_proof",
    "nonce": "base64...",
    "signature": "base64..."
  }
}
```

要求：

- `message_id` 全局唯一。
- `seq` 单调递增，用于重放检测。
- `timestamp` 允许小范围时钟漂移，但不能作为唯一安全依据。
- `auth.signature` 必须覆盖 method、params、seq、session_id、nonce。

### 6.3 RPC Response

```json
{
  "message_id": "msg_01H...",
  "correlation_id": "msg_01H...",
  "ok": true,
  "result": {},
  "error": null
}
```

错误响应必须结构化：

```json
{
  "ok": false,
  "error": {
    "code": "permission_denied",
    "message": "shell execution requires approval",
    "retryable": false,
    "details": {
      "required_permission": "tool.shell.execute"
    }
  }
}
```

### 6.4 Event Envelope

```json
{
  "event_id": "evt_01H...",
  "run_id": "run_01H...",
  "session_id": "sess_01H...",
  "source": {
    "plugin_id": "dsh-mobile-bridge.transport",
    "kind": "transport"
  },
  "type": "approval_required",
  "level": "info",
  "timestamp": "2026-08-14T00:00:00.000Z",
  "seq": 128,
  "data": {},
  "redaction": {
    "contains_sensitive_content": false,
    "policy": "default"
  }
}
```

事件要求：

- 每个 run 内 `seq` 单调递增。
- 事件必须 append-only。
- 事件不得就地修改。
- 修正只能通过新的 `event_correction` 事件表达。
- 手机断线重连后必须可以按 `seq` 补齐。

### 6.5 Task Submit

```json
{
  "workspace_ref": "workspace:current",
  "task_kind": "agent.run",
  "profile": "default",
  "input": {
    "prompt": "分析当前改动的风险",
    "attachments": []
  },
  "provider": {
    "id": "deepseek.provider",
    "model": "deepseek-chat"
  },
  "policy": {
    "tool_mode": "approval_required",
    "network_mode": "allowlist",
    "artifact_visibility": "mobile_summary"
  }
}
```

手机端提交的是任务 intent，不是 shell 命令。

### 6.6 Approval Request

```json
{
  "approval_id": "appr_01H...",
  "run_id": "run_01H...",
  "requested_by": {
    "plugin_id": "dsh-tool-shell",
    "tool": "shell"
  },
  "action": {
    "kind": "shell.execute",
    "preview": "pytest tests/",
    "digest": "sha256:..."
  },
  "risk": "medium",
  "scope": {
    "workspace": "current",
    "ttl_seconds": 300,
    "max_uses": 1
  },
  "explain": "测试当前改动是否破坏已有用例"
}
```

Approval decision：

```json
{
  "approval_id": "appr_01H...",
  "decision": "approve",
  "device_id": "dev_01H...",
  "user_presence": "confirmed",
  "signature": "base64..."
}
```

要求：

- approval 必须绑定 action digest。
- 用户批准的内容与实际执行内容必须一致。
- approval 不得被复用于不同 command、path、URL 或 run。
- 手机端 UI 必须展示风险、动作预览、作用域和有效期。

### 6.7 Artifact Reference

手机端不得默认拉取完整敏感 artifact。必须先拿引用。

```json
{
  "artifact_id": "art_01H...",
  "run_id": "run_01H...",
  "kind": "report.html",
  "visibility": "mobile_summary",
  "size_bytes": 18422,
  "digest": "sha256:...",
  "redaction": "applied",
  "download_method": "artifact.get"
}
```

Artifact 可见性：

| Visibility | 语义 |
| --- | --- |
| `mobile_summary` | 可在手机展示的摘要。 |
| `mobile_redacted` | 已脱敏内容，可按需查看。 |
| `pc_only` | 只允许 PC 查看。 |
| `approval_required` | 手机查看前需要单独审批。 |

## 7. 设备配对与认证

### 7.1 配对原则

配对必须满足：

- 一次性。
- 短 TTL。
- 可撤销。
- 不暴露长期密钥。
- 不暴露 API Key。
- 不依赖公网服务。

### 7.2 LAN 配对流程

```text
1. PC 生成 ephemeral pairing token 和 PC public key。
2. PC 展示二维码。
3. 手机扫码，连接 PC pairing endpoint。
4. 手机生成 device keypair。
5. 手机提交 device public key + pairing token proof。
6. PC 校验 token，要求本地用户确认或自动确认本机可见二维码。
7. PC 颁发 device_id 和 session bootstrap material。
8. 双方建立 authenticated session。
9. pairing token 立即失效。
```

二维码内容只能包含：

- PC 地址或 relay 地址。
- pairing id。
- ephemeral public key。
- token proof 或 token reference。
- 协议版本。

二维码不得包含：

- API Key。
- workspace 绝对路径。
- 用户 prompt。
- 长期 session token。

### 7.3 Session 认证

Session 必须使用：

- device keypair。
- challenge-response。
- nonce。
- seq。
- TTL。

Session 过期后必须重新认证。设备撤销后所有 session 立即失效。

### 7.4 设备分级

| Trust Level | 权限 |
| --- | --- |
| `viewer` | 查看任务状态和已脱敏摘要。 |
| `operator` | 发起任务、取消任务、查看脱敏日志。 |
| `approver` | 审批中风险工具动作。 |
| `admin` | 配对设备、撤销设备、修改移动桥接设置。 |

默认新设备只能是 `viewer` 或 `operator`。`admin` 只能在 PC 端授予。

## 8. 权限沙箱策略

### 8.1 权限模型

权限由三部分组成：

```text
principal + capability + scope -> decision
```

示例：

```json
{
  "principal": {
    "kind": "mobile_device",
    "device_id": "dev_01H...",
    "trust_level": "operator"
  },
  "capability": "task.submit",
  "scope": {
    "workspace": "current",
    "profile": "default"
  }
}
```

### 8.2 Capability 分类

| Capability | 默认策略 | 说明 |
| --- | --- | --- |
| `task.submit` | allow for operator | 发起任务 intent。 |
| `task.cancel` | allow for operator | 取消自己发起或当前 run。 |
| `run.events.read` | allow redacted | 查看事件流。 |
| `artifact.read.summary` | allow | 查看摘要 artifact。 |
| `artifact.read.full` | ask | 查看完整 artifact。 |
| `tool.fs.read.workspace` | ask or allow by profile | 读取 workspace 文件。 |
| `tool.fs.write.workspace` | ask | 写入 workspace 文件。 |
| `tool.fs.read.external` | deny by default | 读取 workspace 外文件。 |
| `tool.shell.execute` | ask | 执行 shell。 |
| `tool.network.connect` | allowlist/ask | 访问网络。 |
| `secret.read` | deny for mobile | 读取 secret。 |
| `plugin.install` | deny for mobile | 安装插件。 |
| `plugin.enable` | deny for mobile | 启用插件。 |
| `settings.credentials.write` | deny for mobile | 写凭据设置。 |
| `relay.enable` | admin on PC only | 开启公网 relay。 |

### 8.3 Lease

授权必须以 lease 表达。

```json
{
  "lease_id": "lease_01H...",
  "capability": "tool.shell.execute",
  "scope": {
    "command_digest": "sha256:...",
    "workspace": "current"
  },
  "ttl_seconds": 300,
  "max_uses": 1,
  "revocable": true
}
```

禁止永久性隐式授权高风险 capability。

### 8.4 沙箱执行

PC 端执行工具时必须使用 DSH sandbox 层或等价隔离：

- Linux：bwrap / landlock-run / namespace 隔离。
- macOS：Seatbelt 或等价 profile。
- Windows：restricted token / ACL 限制。

最低要求：

- 每个 run 独立工作目录。
- 默认只允许 workspace 范围内读写。
- shell 默认无网络或走 allowlist。
- 环境变量必须剥离 secret。
- 子进程输出必须脱敏后进入事件流。

### 8.5 文件系统策略

| 动作 | 策略 |
| --- | --- |
| 读取 workspace 内文件 | profile 可允许；敏感文件仍需拦截。 |
| 写 workspace 内文件 | 需要 approval 或 PC 端 profile 明确允许。 |
| 删除文件 | 必须 approval。 |
| 读取 workspace 外文件 | 默认拒绝。 |
| 写 workspace 外文件 | 默认拒绝。 |
| 访问 `.env`、credentials、SSH key | 默认拒绝并产生安全事件。 |

### 8.6 Shell 策略

Shell 执行必须满足：

- 命令预览和 digest 展示给审批者。
- 审批绑定精确命令，不允许批准后替换。
- 默认超时。
- 默认工作目录限定。
- 默认剥离 secret env。
- 输出脱敏。
- 失败保留 stderr/stdout 摘要。

### 8.7 网络策略

Provider 插件只能访问 manifest 声明的 endpoint。

DeepSeek provider 例：

```json
{
  "network.connect": ["https://api.deepseek.com"]
}
```

任意网络访问插件必须：

- 声明域名 allowlist。
- 说明用途。
- 接受 policy plugin 决策。
- 输出请求 metadata，不输出 Authorization。

### 8.8 Secret 策略

Secret 只能存在于：

- PC 端 OS secret store。
- 启动环境。
- PC 端主进程内存中的短期使用窗口。

Secret 不得出现在：

- 手机端。
- RPC envelope。
- Event envelope。
- artifact。
- crash report。
- diagnostic bundle。
- WebView cache。
- localStorage。
- ordinary config。

插件只能请求 secret handle：

```ts
type SecretHandle = {
  id: string;
  provider: "os-keychain" | "env" | "file-credential";
  redacted: true;
};
```

只有被授权的 provider plugin 能在 PC 端使用 handle 解析 raw secret。

## 9. 事件与可观测性

### 9.1 必须记录的事件

- `device_pairing_created`
- `device_pairing_completed`
- `device_revoked`
- `session_opened`
- `session_closed`
- `task_submitted`
- `run_started`
- `provider_request_started`
- `provider_stream_delta`
- `tool_action_requested`
- `approval_required`
- `approval_decided`
- `tool_action_started`
- `tool_action_completed`
- `artifact_written`
- `run_completed`
- `run_failed`
- `security_policy_denied`

### 9.2 审计事件

审批和权限相关事件必须包含：

- actor principal。
- device id。
- action digest。
- policy decision。
- lease id。
- timestamp。
- run id。
- plugin id。

不得包含：

- raw secret。
- Authorization header。
- 未脱敏 prompt 全文，除非 profile 明确允许。

### 9.3 Token 与命中率观察

token observer plugin 应统一记录：

```json
{
  "run_id": "run_01H...",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "prompt_tokens": 12000,
  "completion_tokens": 800,
  "cache_read_tokens": 9000,
  "cache_hit_ratio": 0.75
}
```

缓存命中率定义：

```text
cache_hit_ratio = cache_read_tokens / prompt_tokens
```

如果 provider 不返回 cache 字段，observer 必须标记为 `unknown`，不得伪造。

## 10. UI Surface 规范

### 10.1 手机端必须展示

任务页必须展示：

- 当前连接的 PC 名称。
- workspace 显示名。
- provider/model。
- task/run 状态。
- 风险策略摘要。
- 实时日志摘要。
- 审批请求。
- 结果摘要和 artifact 引用。

### 10.2 审批 UI 必须展示

- 动作类型。
- 动作预览。
- 风险等级。
- 执行插件。
- 作用域。
- 有效期。
- 一次性/多次使用。
- 拒绝选项。

### 10.3 手机端不得展示

默认不得展示：

- API Key。
- 完整 `.env`。
- SSH key。
- workspace 绝对敏感路径。
- 未脱敏诊断包。

### 10.4 PC 端设置页必须展示

- 移动桥接开关。
- 当前绑定设备。
- 设备 trust level。
- 最近 session。
- 最近审批。
- LAN 地址和 QR 配对入口。
- relay 是否启用。
- 撤销全部设备按钮。

## 11. 存储与数据归档

### 11.1 PC 端存储

PC 端必须持久化：

- paired device registry。
- session metadata。
- run metadata。
- canonical JSONL event log。
- artifact index。
- policy decisions。
- approval audit。

### 11.2 手机端存储

手机端只允许持久化：

- device private key 或平台安全存储中的等价材料。
- device id。
- PC display name。
- 最近连接 metadata。
- UI 偏好。

手机端不得持久化：

- API Key。
- raw prompt cache。
- full artifact，除非用户显式下载且内容已脱敏。

### 11.3 数据保留

默认策略：

- PC run 证据按 workspace 策略保留。
- 手机端缓存短 TTL。
- 设备撤销后，手机 session 立即失效。
- 诊断包白名单导出。

## 12. 错误处理与恢复

### 12.1 断线恢复

手机断线重连后必须：

- 重新认证 session。
- 提供 last seen event seq。
- PC 返回缺失事件或告知事件已过期。
- UI 明确标记可能丢失的时间窗口。

### 12.2 PC 重启恢复

PC 重启后必须：

- 恢复 paired device registry。
- 关闭旧 session。
- 标记运行中 run 为 interrupted 或按 DSH 能力恢复。
- 保留已写入 artifact。
- 要求手机重新建立 session。

### 12.3 Relay 故障

relay 故障不得影响本地 DSH 运行。

如果 relay 不可用：

- LAN 模式仍可用。
- 已运行任务继续。
- 手机端显示连接故障。
- 不得自动降级到未认证 HTTP。

## 13. 测试门禁

### 13.1 Contract Tests

必须覆盖：

- manifest 解析。
- plugin capability negotiation。
- RPC envelope schema。
- event envelope schema。
- approval request/decision schema。
- artifact reference schema。
- protocol version compatibility。

### 13.2 Security Tests

必须覆盖：

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

### 13.3 Recovery Tests

必须覆盖：

- 手机断线重连补事件。
- PC 重启后 session 失效。
- worker crash 后 run 标记 interrupted。
- approval 超时后动作拒绝。
- relay 故障后 LAN 模式继续。

### 13.4 E2E MVP Tests

MVP 完成必须通过：

```text
PC 启动 mobile bridge
-> 手机扫码配对
-> 手机提交 DeepSeek 任务
-> PC 执行 DSH run
-> 手机看到实时事件
-> shell/tool action 触发审批
-> 手机拒绝后动作不执行
-> 手机批准后动作只执行一次
-> run 完成
-> 手机查看脱敏结果
-> PC artifact 可复现
```

## 14. 发布与兼容性

### 14.1 插件版本

插件版本必须遵循 semver。

破坏性变更必须：

- 增加 major。
- 提供迁移说明。
- 提供兼容期或明确拒绝加载。

### 14.2 DSH 兼容

由于 DSH 仍处于可能破坏性变更阶段，插件必须：

- 明确声明兼容的 DSH 版本范围。
- 启动时做 runtime capability check。
- 不依赖未声明的内部 API。
- 优先使用公开 host/plugin 契约。

### 14.3 发布物

发布 mobile bridge 插件必须包含：

- 插件包。
- manifest。
- checksum。
- SBOM。
- 测试报告。
- 权限清单。
- 威胁模型摘要。
- 变更日志。

### 14.4 禁止事项

禁止发布：

- 未认证 LAN RPC。
- 默认监听 `0.0.0.0` 的控制面。
- 自动暴露 workspace 的手机页面。
- 未脱敏日志流。
- 无签名校验的自动更新。

## 15. MVP 插件集

MVP 只实现以下插件：

| 插件 | 类型 | 作用 |
| --- | --- | --- |
| `dsh-mobile-bridge.transport` | transport | LAN 配对、认证 session、RPC、事件流。 |
| `dsh-mobile-approval.policy` | policy | 高风险动作审批、lease 管理。 |
| `dsh-mobile-surface.ui` | ui | 手机控制面。 |
| `dsh-deepseek-provider.provider` | provider | DeepSeek/OpenAI-compatible provider，若上游已有则复用。 |
| `dsh-token-usage.observer` | observer | token 用量和缓存命中率统计。 |
| `dsh-local-artifact.storage` | storage | 本地 artifact 引用和脱敏导出。 |

MVP 不实现：

- relay。
- 多 PC 同时控制。
- 插件市场。
- 移动端代码编辑。
- 手机端凭据管理。
- 任意远程 shell。

## 16. ADR 要求

实现前必须创建 ADR：

| ADR | 标题 |
| --- | --- |
| ADR-MP-001 | Mobile bridge transport: LAN first vs relay first |
| ADR-MP-002 | Pairing and session authentication |
| ADR-MP-003 | Permission lease and approval policy |
| ADR-MP-004 | Mobile artifact visibility and redaction |
| ADR-MP-005 | Provider secret handling for DeepSeek |
| ADR-MP-006 | Event log schema and recovery |
| ADR-MP-007 | DSH upstream compatibility strategy |

任何没有 ADR 的实现都只能进入 spike，不得进入主线。

## 17. Definition of Ready

一个 mobile-PC 插件功能进入开发前，必须具备：

- 功能所属插件类型。
- manifest 权限声明。
- 协议 schema。
- policy 决策路径。
- 安全风险分级。
- 审计事件定义。
- 恢复语义。
- 测试清单。

## 18. Definition of Done

一个 mobile-PC 插件功能完成必须满足：

- 通过 contract tests。
- 通过 security tests。
- 通过 recovery tests。
- 不泄露 secret。
- 不绕过 policy。
- 事件可追踪。
- artifact 可复现。
- 文档和 ADR 已更新。

## 19. 优先级裁剪规则

当开发资源不足时，按以下顺序保留：

1. PC 端 headless run 正确性。
2. 权限和 secret 安全。
3. 配对认证。
4. 事件与 artifact 证据。
5. 手机审批。
6. 手机实时日志。
7. 手机结果摘要。
8. 推送通知。
9. relay。
10. 多设备体验增强。

不得为了 UI 体验牺牲 1-4。

## 20. 结论

基于 "Everything is a plugin" 的 DSH 手机联动 PC 设计，正确方向是：

```text
小内核
+ typed plugin contracts
+ transport 可替换
+ policy-first 权限模型
+ PC-side secret/tool/runtime
+ mobile-side intent/approval/view
+ append-only event evidence
```

如果一个设计让手机拿到 raw secret、绕过 PC policy、直接暴露本地 RPC、或让 run 无法 headless 复现，它就违反本宪法。

如果一个设计只是把 DSH localhost 页面搬到手机上访问，它没有实现插件化手机联动，只是扩大了攻击面。
