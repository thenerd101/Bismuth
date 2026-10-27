uniform sampler2D u_spriteSheetTexture;

in vec2 t_texCoord;
in vec4 t_color;

out vec4 FragColor;

void main() {
    //discard;
    
    /*
    if (t_opacity == 1.0) {
        FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Flat Solid Green
    } else if (t_opacity == 0.0) {
        FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Flat Solid Red
    } else {
        FragColor = vec4(0.0, 0.0, 1.0, 1.0); // Flat Solid Blue
    }
    */

    //FragColor = texture(u_spriteSheetTexture, t_texCoord) * t_color * vec4(1.0, 1.0, 1.0, t_opacity); // Just tinkering here
    FragColor = texture(u_spriteSheetTexture, t_texCoord) * t_color;
}