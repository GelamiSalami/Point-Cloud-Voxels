
import { boxIntersection } from "./boxIntersection.glsl.js";

const vertex = `#version 300 es
in vec4 aPosition;
in vec2 aUv;

out vec2 vUv;
out vec4 vRayDirection;

uniform mat4 uInvViewProjMatrix;

void main() {
	gl_Position = aPosition;
	vUv = aUv;
	vRayDirection = uInvViewProjMatrix * vec4(aPosition.xy, 1, 1);
}
`;

const fragment = `#version 300 es
precision highp float;

in vec2 vUv;
in vec4 vRayDirection;

out vec4 fragColor;

uniform sampler2D uTexture;

uniform vec3 uCameraPosition;
uniform int uOffset;

#define MAX_DIST 1e3

${boxIntersection}

void main() {
	vec3 color = texture(uTexture, vUv).rgb;
	vec3 rayDir = normalize(vRayDirection.xyz / vRayDirection.w - uCameraPosition);
	vec3 invRayDir = 1.0 / rayDir;
	vec3 signRayDir = -sign(rayDir);
	vec3 rayOrigin = uCameraPosition;
	vec3 boxOffset = 0.5 * abs(invRayDir);

	ivec2 fragCoord = ivec2(gl_FragCoord.xy);

	vec3 nearestPos = texelFetch(uTexture, fragCoord, 0).xyz;
	vec3 nearestNormal;
	// float t = MAX_DIST;
	float t = boxIntersection(rayOrigin - nearestPos, invRayDir, signRayDir, boxOffset, nearestNormal).x;

#if 0
	#define SIZE 11
	for (int i = -SIZE; i <= SIZE; i++) {{
			vec4 voxelPos = texelFetch(uTexture, fragCoord + i * uOffset, 0);
#else
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			vec4 voxelPos = texelFetch(uTexture, fragCoord + ivec2(x, y) * uOffset, 0);
#endif

			if (nearestPos == voxelPos.xyz || voxelPos.z == 0.0)
				continue;

			vec3 boxNormal;
			float boxT = boxIntersection(rayOrigin - voxelPos.xyz, invRayDir, signRayDir, boxOffset, boxNormal).x;

			if (boxT < t) {
				t = boxT;
				nearestPos = voxelPos.xyz;
				nearestNormal = boxNormal;
			}
		}
	}

	vec3 boxNormalStep = vec3(greaterThan(nearestNormal, vec3(0)));
	float normalID = abs(nearestNormal.x) > 0.0 ? boxNormalStep.x :
					 abs(nearestNormal.y) > 0.0 ? boxNormalStep.y + 2.0 : boxNormalStep.z + 4.0;

	fragColor = vec4(nearestPos, normalID);
}
`;

export default { vertex, fragment };