# Dedicated glass renderer

`three-glass.min.js` is the unmodified Three.js 0.160.1 UMD build, downloaded from
https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js .

Upstream: https://github.com/mrdoob/three.js/tree/r160
License: MIT (upstream copyright/license notice retained in the distributed file).

Only lantern.html uses this build. Other pages retain their existing renderer.
The physical glass material needs thickness, IOR and attenuation parameters absent
from this project's older renderer. No external runtime request is required.
