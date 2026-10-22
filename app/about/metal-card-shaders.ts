/** Fullscreen triangle shared by the two blur passes and the metal pass. */
export const vertexShader = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const blurShader = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_step;
out vec4 outColor;
void main() {
  vec3 color = texture(u_image, v_uv).rgb * 0.227027;
  color += texture(u_image, v_uv + u_step * 1.384615).rgb * 0.316216;
  color += texture(u_image, v_uv - u_step * 1.384615).rgb * 0.316216;
  color += texture(u_image, v_uv + u_step * 3.230769).rgb * 0.070270;
  color += texture(u_image, v_uv - u_step * 3.230769).rgb * 0.070270;
  outColor = vec4(color, 1.0);
}`;

export const metalShader = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_size;
uniform vec2 u_angles;
out vec4 outColor;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
mat3 orientation(vec2 a) {
  // CSS has a downward Y axis. Rx(-x) * Ry(y) matches rotateX(x) rotateY(y).
  float cx = cos(-a.x), sx = sin(-a.x), cy = cos(a.y), sy = sin(a.y);
  mat3 rx = mat3(1,0,0, 0,cx,sx, 0,-sx,cx);
  mat3 ry = mat3(cy,0,-sy, 0,1,0, sy,0,cy);
  return rx * ry;
}
void main() {
  vec2 p = (v_uv - 0.5) * u_size;
  vec2 corner = abs(p) - (u_size * 0.5 - 24.0);
  float distanceToEdge = length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - 24.0;
  float coverage = 1.0 - smoothstep(-fwidth(distanceToEdge), 0.0, distanceToEdge);
  if (coverage <= 0.0) discard;

  vec2 edgeDirection = corner.x > corner.y ? vec2(sign(p.x), 0) : vec2(0, sign(p.y));
  if (corner.x > 0.0 && corner.y > 0.0) edgeDirection = normalize(max(corner, 0.0)) * sign(p);
  float bevel = smoothstep(-5.0, -0.5, distanceToEdge);
  vec2 grainCell = floor(v_uv * u_size * vec2(1.0, 2.0));
  float grain = hash(grainCell) - 0.5;
  float brushed = hash(vec2(0.0, grainCell.y)) - 0.5;
  vec3 localNormal = normalize(vec3(edgeDirection * bevel * 0.7 + vec2(grain * 0.006, brushed * 0.012), 1.0));
  mat3 rotation = orientation(u_angles);
  vec3 surface = rotation * vec3(p / 500.0, 0.0);
  vec3 N = normalize(rotation * localNormal);
  vec3 incident = normalize(surface - vec3(0, 0, 3.0)); // camera -> surface
  vec3 R = reflect(incident, N); // GLSL argument order is incident, normal
  float denominator = max(R.z, 0.2);
  float q = R.z / denominator;
  vec2 UV = v_uv + 0.12 * q * R.xy / denominator;
  vec3 reflected = texture(u_image, clamp(UV, vec2(0.001), vec2(0.999))).rgb;
  float luminance = dot(reflected, vec3(0.2126, 0.7152, 0.0722));
  // Neutral silver: desaturate the actual planar environment sample.
  vec3 metal = vec3(0.28 + luminance * 0.66);
  metal += vec3(grain * 0.012 + brushed * 0.006);
  float fresnel = pow(1.0 - max(dot(-incident, N), 0.0), 3.0);
  metal += vec3(fresnel * 0.16);
  outColor = vec4(metal * coverage, coverage);
}`;
