
const vertex = `#version 300 es
in vec4 aPosition;
in vec2 aUv;

out vec2 vUv;

void main() {
	gl_Position = aPosition;
	vUv = aUv;
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec3 uVolumeSize;

in vec2 vUv;

out vec4 fragColor;

const float PI = acos(-1.0);
const float TAU = PI * 2.0;

float hash13(vec3 p3)
{
	p3  = fract(p3 * .1031);
	p3 += dot(p3, p3.zyx + 31.32);
	return fract((p3.x + p3.y) * p3.z);
}

vec3 palette3(float t)
{
	return .5 + .5 * cos(TAU * (vec3(1, 1, 0.8) * t + vec3(0, 0.25, 0.5)));
}

const vec3[6] boxNormals = vec3[](
	vec3(-1, 0, 0),
	vec3( 1, 0, 0),
	vec3(0, -1, 0),
	vec3(0,  1, 0),
	vec3(0, 0, -1),
	vec3(0, 0,  1)
);

void main() {
	vec4 voxel = texelFetch(uTexture, ivec2(gl_FragCoord.xy), 0);

	vec3 color = palette3(hash13(round(voxel.xyz)));

	vec3 normal = boxNormals[int(round(voxel.w))];

	color *= smoothstep(0.4, 1.0, length(voxel.xyz - uVolumeSize * 0.5) / (uVolumeSize * 0.5)) * 0.8 + 0.2;
	color *= dot(abs(normal), vec3(0.8, 1, 0.9));

	if (voxel.xyz == vec3(0))
		color = vec3(0.04, 0.05, 0.06);

	fragColor = vec4(color, 1);
}
`;

export default { vertex, fragment };

