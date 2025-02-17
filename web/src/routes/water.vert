#include <common>
#include <shadowmap_pars_vertex>

uniform sampler2D tDisplacement;
uniform mat4 uTextureMatrix;
uniform float uDisplacementAmount;
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

  float displacement = texture2D(tDisplacement, vUv + uTime / 16.0).r;
  displacement = ((displacement * 2.0) - 1.0) * uDisplacementAmount;

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