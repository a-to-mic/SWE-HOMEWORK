# Unity battle template

这个目录放的是 Unity 侧脚本模板，不是网页运行文件。

使用方式：

1. 在 Unity 新建一个 2D 或 3D 项目。
2. 把 `Assets` 文件夹复制进 Unity 项目。
3. 场景里创建一个空对象，命名为 `BattleBridge`。
4. 给它挂上 `BattleBridge.cs`。
5. 在 Inspector 里绑定：
   - 玩家和敌人的 `Animator`
   - 玩家和敌人的血条 `Slider`
   - 名字和数值 `Text`
6. Animator 里添加 Trigger：
   - 玩家：`steady`、`normal`、`fierce`、`hit`、`win`、`lose`
   - 敌人：`attack`、`hit`、`win`、`lose`
7. Build Settings 选择 WebGL，导出后按 `public/unity-battle/README.md` 放入网页项目。

