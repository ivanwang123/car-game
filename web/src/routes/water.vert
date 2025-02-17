#include <common>
#include <shadowmap_pars_vertex>

uniform sampler2D tDisplacement;
uniform mat4 uTextureMatrix;
uniform float uTime;

varying vec2 vUv;
varying vec4 vTextureUV;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vViewPosition;

void main() {
#include <beginnormal_vertex>
#include <defaultnormal_vertex>

#include <begin_vertex>

  // clang-format off
#include <worldpos_vertex>
#include <shadowmap_vertex>
  // clang-format on

  vUv = uv;
  vTextureUV = uTextureMatrix * vec4(position, 1.0);

  vec2 displacementUV = vUv;
  displacementUV.y += 1.0 * 0.01 *
                      (sin(displacementUV.x * 3.5 + uTime * 0.35) +
                       sin(displacementUV.x * 4.8 + uTime * 1.05) +
                       sin(displacementUV.x * 7.3 + uTime * 0.45)) /
                      3.0;
  displacementUV.x += 1.0 * 0.12 *
                      (sin(displacementUV.y * 4.0 + uTime * 0.50) +
                       sin(displacementUV.y * 6.8 + uTime * 0.75) +
                       sin(displacementUV.y * 11.3 + uTime * 0.2)) /
                      3.0;
  displacementUV.y += 1.0 * 0.12 *
                      (sin(displacementUV.x * 4.2 + uTime * 0.64) +
                       sin(displacementUV.x * 6.3 + uTime * 1.65) +
                       sin(displacementUV.x * 8.2 + uTime * 0.45)) /
                      3.0;

  float displacement = texture2D(tDisplacement, displacementUV).r;
  displacement = ((displacement * 2.0) - 1.0) * 0.4;

  vec4 newPosition = vec4(position, 1.0);
  newPosition.z += displacement;

  vec4 modelPosition = modelMatrix * newPosition;
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);
  vViewPosition = viewPosition.xyz;

  gl_Position = clipPosition;
}