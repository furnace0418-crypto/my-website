# 灯台参考与许可

本功能的六种灯型由 lantern.js 参数化生成，未使用外部灯具模型。

- Three.js r128： https://github.com/mrdoob/three.js/tree/r128 （MIT，许可证随 vendor/THREE-LICENSE.txt 保存）。使用本地经典脚本版本兼容直接 file:// 打开。
- OrbitControls： https://github.com/mrdoob/three.js/blob/r128/examples/js/controls/OrbitControls.js ，用于旋转、阻尼、缩放。
- LatheGeometry： https://github.com/mrdoob/three.js/blob/r128/src/geometries/LatheGeometry.js ，用于灯罩轮廓旋转成型。
- MeshPhysicalMaterial： https://github.com/mrdoob/three.js/blob/r128/src/materials/MeshPhysicalMaterial.js ，用于材质粗糙度、清漆和透明表面。
- 作品研究： https://github.com/MengTo/kage ，参考其程序化灯笼、夜景灯光思路；原作未授权复用，未复制代码或图片。
- 作品调研： https://github.com/Thre4dripper/Infinity-Castle-ThreeJs ，参考程序化建筑与灯笼场景方向，未复用源码。

宣纸纹理及竹叶纹样为 Canvas 本地生成。琉璃使用透明与清漆近似，并非离线路径追踪玻璃。保存仅写入当前浏览器 localStorage。
