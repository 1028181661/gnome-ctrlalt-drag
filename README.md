# Ctrl+Drag No Raise — Linux GNOME Shell 扩展

按住 **Ctrl 键** 拖拽文件时，**阻止源窗口置前**，让你能直接拖入背后的目标窗口 — 就像 macOS 的 ⌘+拖拽 一样。

## 效果

| 场景 | 正常行为 | 装了这个扩展后 |
|------|---------|--------------|
| 不按 Ctrl 拖文件 | 源窗口跳前，挡住目标窗口 | **不变**（和原来一样） |
| **按住 Ctrl 拖文件** | 源窗口跳前，挡住目标窗口 | **源窗口不置前**，直接拖入背后窗口 |

## 安装

```bash
cd gnome-ctrlalt-drag
bash install.sh
```

重启 GNOME Shell（X11 下 **Alt+F2 → r**），然后启用：

```bash
gnome-extensions enable ctrlalt-drag@user
```

## 使用

1. 打开两个重叠的窗口（如 Dolphin 在后面，微信在前面）
2. **按住 Ctrl 键**
3. 从后面的窗口点击文件并拖拽到前面的窗口
4. 源窗口不会跳到最前，直接放下即可

拖拽中途松开 Ctrl → 恢复正常的窗口置前。  
再按住 Ctrl → 再次抑制。

> macOS 的 Cmd 键在 Linux 上通常映射为 Ctrl（语义一致 — Dolphin/Nautilus 中 Ctrl+drag 会复制文件）。

## 工作原理

### 架构

只使用两个 GNOME Shell 信号，轻量无轮询：

1. **`notify::focus-window`** — 检测 Ctrl+点击的瞬间，记录源窗口
2. **`MetaWindow::raise`** — 窗口即将置顶时拦截，以 **50ms 延迟异步压窗**，避免与 Mutter 堆叠操作的竞态条件

使用 `global.get_pointer()` 实时查询系统修饰键状态，不依赖键盘事件监听（兼容 Wayland 的事件隔离机制）。

### 为什么不用 Super（Win）键？

很多发行版将 `org.gnome.desktop.wm.preferences.mouse-button-modifier` 默认设为 `<Super>`，导致 Win+拖拽被拦截为窗口移动操作。Ctrl 没有这个冲突。

## 文件结构

```
gnome-ctrlalt-drag/
├── extension.js       # 核心扩展代码
├── metadata.json      # 扩展元数据
├── install.sh         # 安装/卸载脚本
├── LICENSE            # MIT 许可证
└── README.md          # 本文档
```

## 测试环境

本扩展在以下环境中开发与测试通过：

| 项目 | 版本 |
|------|------|
| 操作系统 | Ubuntu 24.04.4 LTS (Noble Numbat) |
| Linux 内核 | 6.8.0-83-generic |
| 显示服务 | X11 |
| GNOME Shell | 46.0 |
| 文件管理器 | Dolphin (KDE Frameworks) |

> Wayland 理论上兼容但未充分测试，欢迎反馈。

## 已知问题

- **Dolphin 拖拽时源窗口可能被最小化** — 原因是 Qt DND 机制与 GNOME 堆叠策略冲突。正在研究中
- **X11 测试通过，Wayland 理论兼容但未充分测试** — 欢迎反馈
- 仅支持 **GNOME Shell 45~48**

## 卸载

```bash
bash install.sh --remove
```

然后注销重登或重启 Shell。

## 许可证

MIT
