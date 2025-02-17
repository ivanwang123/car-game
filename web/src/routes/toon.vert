#include <common>
#include <shadowmap_pars_vertex>

varying vec2 vUv;
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

  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;

  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);
  vViewPosition = viewPosition.xyz;

  gl_Position = clipPosition;
}