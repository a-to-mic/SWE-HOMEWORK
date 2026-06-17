# Unity WebGL battle export

把 Unity 的 WebGL 构建文件放在这里，网页会自动加载。

需要的最终结构：

```text
public/unity-battle/
  Build/
    unity-battle.loader.js
    unity-battle.data
    unity-battle.framework.js
    unity-battle.wasm
  StreamingAssets/
```

Unity 导出时建议：

1. Build Settings 选择 `WebGL`。
2. Player Settings 里把 Product Name 设为 `unity-battle`。
3. WebGL Template 可先用默认模板。
4. 导出后把 `Build` 和 `StreamingAssets` 复制到这个目录。
5. 如果导出的文件名不是 `unity-battle.*`，请把它们改成上面的名字。

网页会调用 Unity 中名为 `BattleBridge` 的 GameObject：

```text
BattleBridge.ReceiveBattleState(json)
BattleBridge.PlaySkill(json)
```

