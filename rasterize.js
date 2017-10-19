/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

var pMatrix = mat4.create(); //perspective matrix for the shader program
var mvMatrix = mat4.create();
var vertexBuffer;
var triVertexNormalBuffer;
var triAmbiColorBuffer;
var triDiffColorBuffer;
var triSpecColorBuffer;
var triangleBuffer;
var sphereVertexBuffer;
var sphereVertexNormalBuffer;
var sphereAmbiColorBuffer;
var sphereDiffColorBuffer;
var sphereSpecColorBuffer;
var sphereIndexBuffer;
var vertexPositionAttrib;
var vertexNormalAttrib;
var ambiColorAttrib;
var diffColorAttrib;
var specColorAttrib;

var sphereCoordArray = [];
var sphereIndexArray = [];
var vertexNormalArray = [];
var sphereAmbiColorArray = [];
var sphereDiffColorArray = [];
var sphereSpecColorArray = [];
var sphereOffsetArray = [];

var eye = new vec3.fromValues(0.5, 0.5, -0.5); // 3d coord of the eye
var lookUp = new vec3.fromValues(0, 1, 0); // lookUp vector for the view matrix;
var lookAt = new vec3.fromValues(0.5, 0.5, 0);
var lightLocation = new vec3.fromValues(2, 4, -0.5);

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
}


function setMatrixUniforms(){
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function loadTriangleData(){
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles"); //console.log(inputTriangles);

    if (inputTriangles != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vertexNormalArray = [];
        var triAmbiColorArray = [];
        var triDiffColorArray = [];
        var triSpecColorArray = [];
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var normalToAdd = [];
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            //console.log("indexOffset:: "+indexOffset);
            var ambiColorToAdd = inputTriangles[whichSet].material.ambient;
            var diffColorToAdd = inputTriangles[whichSet].material.diffuse;
            var specColorToAdd = inputTriangles[whichSet].material.specular;
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                vertexNormalArray.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);
                triAmbiColorArray.push(ambiColorToAdd[0], ambiColorToAdd[1], ambiColorToAdd[2]);
                triDiffColorArray.push(diffColorToAdd[0], diffColorToAdd[1], diffColorToAdd[2]);
                triSpecColorArray.push(specColorToAdd[0], specColorToAdd[1], specColorToAdd[2]);
            } // end for vertices in set
            //console.log(coordArray);
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]); //console.log("triToAdd:: "+triToAdd);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]); //console.log("indexArray:: "+indexArray);
            } // end for triangles in set
            //console.log(indexArray);
            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
        } // end for each triangle set

        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

        triVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triVertexNormalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertexNormalArray),gl.STATIC_DRAW);

        //send the diffuse colors to WebGL
        triAmbiColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triAmbiColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triAmbiColorArray),gl.STATIC_DRAW);
        triDiffColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triDiffColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triDiffColorArray),gl.STATIC_DRAW);
        triSpecColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triSpecColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triSpecColorArray),gl.STATIC_DRAW);

        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
        triangleBuffer.numItems = indexArray.length;
    }
}

function loadSphereData(){
    var inputSpheres = getJSONFile(INPUT_SPHERES_URL,"spheres");
    if(inputSpheres != String.null){
        sphereCoordArray = [];
        sphereIndexArray = [];
        vertexNormalArray = [];
        sphereAmbiColorArray = [];
        sphereDiffColorArray = [];
        sphereSpecColorArray = [];

        var offset = 0;

        for(var whichSet =0; whichSet<inputSpheres.length;whichSet++){
            var center = [];
            var ambiColor = inputSpheres[whichSet].ambient;
            var diffColor = inputSpheres[whichSet].diffuse;
            var specColor = inputSpheres[whichSet].specular;
            center.push(inputSpheres[whichSet].x, inputSpheres[whichSet].y, inputSpheres[whichSet].z);
            var radius_a = inputSpheres[whichSet].a;
            var radius_b = inputSpheres[whichSet].b;
            var radius_c = inputSpheres[whichSet].c;
            var latitudeBands = 30;
            var longitudeBands = 30;
            var coordCount = 0;

            for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
                var theta = latNumber * Math.PI / latitudeBands;
                var sinTheta = Math.sin(theta);
                var cosTheta = Math.cos(theta);

                for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                    var phi = longNumber * 2 * Math.PI / longitudeBands;
                    var sinPhi = Math.sin(phi);
                    var cosPhi = Math.cos(phi);

                    var x = cosPhi * sinTheta;
                    var y = cosTheta;
                    var z = sinPhi * sinTheta;

                    sphereCoordArray.push(center[0]+radius_a * x);
                    sphereCoordArray.push(center[1]+radius_b * y);
                    sphereCoordArray.push(center[2]+radius_c* z);

                    //calculate and store the vertex normals in a 1D array
                    var normal = [radius_a * x, radius_b * y, radius_c * z];
                    var normalise = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
                    normal = [normal[0]/normalise, normal[1]/normalise, normal[2]/normalise];
                    vertexNormalArray.push(normal[0], normal[1], normal[2]);
                    //
                    sphereAmbiColorArray.push(ambiColor[0], ambiColor[1], ambiColor[2]);
                    sphereDiffColorArray.push(diffColor[0], diffColor[1], diffColor[2]);
                    sphereSpecColorArray.push(specColor[0], specColor[1], specColor[2]);

                    coordCount = coordCount + 1;
                }
            }
            for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
                for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
                    var first = (latNumber * (longitudeBands + 1)) + longNumber;
                    var second = first + longitudeBands + 1;
                    sphereIndexArray.push(offset+first);
                    sphereIndexArray.push(offset+second);
                    sphereIndexArray.push(offset+first + 1);

                    sphereIndexArray.push(offset+second);
                    sphereIndexArray.push(offset+second + 1);
                    sphereIndexArray.push(offset+first + 1);
                }
            }
            sphereOffsetArray.push(offset);
            offset = offset + coordCount;
        }
        bindSphereBuffers();
    }
}

function bindSphereBuffers(){
    sphereVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,sphereVertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sphereCoordArray),gl.STATIC_DRAW); // coords to that buffer
    //console.log(coordArray);

    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormalArray),gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize=3;
    sphereVertexNormalBuffer.numItems=vertexNormalArray.length;

    sphereAmbiColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,sphereAmbiColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sphereAmbiColorArray),gl.STATIC_DRAW);

    sphereDiffColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,sphereDiffColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sphereDiffColorArray),gl.STATIC_DRAW);

    sphereSpecColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,sphereSpecColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sphereSpecColorArray),gl.STATIC_DRAW);

    sphereIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereIndexArray), gl.STATIC_DRAW);
    //console.log(indexArray);
    sphereIndexBuffer.numItems = sphereIndexArray.length;
}

function renderTriangles(){
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,triVertexNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,triAmbiColorBuffer);
    gl.vertexAttribPointer(ambiColorAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,triDiffColorBuffer);
    gl.vertexAttribPointer(diffColorAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,triSpecColorBuffer);
    gl.vertexAttribPointer(specColorAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer);
    gl.drawElements(gl.TRIANGLES,triangleBuffer.numItems,gl.UNSIGNED_SHORT,0); // render
}

function renderSpheres(){
    gl.bindBuffer(gl.ARRAY_BUFFER,sphereVertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,sphereVertexNormalBuffer); // activate
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,sphereAmbiColorBuffer);
    gl.vertexAttribPointer(ambiColorAttrib, 3, gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,sphereDiffColorBuffer);
    gl.vertexAttribPointer(diffColorAttrib, 3, gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER,sphereSpecColorBuffer);
    gl.vertexAttribPointer(specColorAttrib, 3, gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sphereIndexBuffer);
    gl.drawElements(gl.TRIANGLES,sphereIndexBuffer.numItems,gl.UNSIGNED_SHORT,0); // render
}

function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    renderTriangles();
    renderSpheres();
}

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;

        varying vec3 vColor;

        void main(void) {
            //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // all fragments are white
            gl_FragColor = vec4(vColor,1.0);
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec3 ambiRGB;
        attribute vec3 diffRGB;
        attribute vec3 specRGB;
        attribute vec3 vertexColor;
        
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform vec3 lightLocation;
        uniform vec3 eyeLocation;

        varying vec3 vColor;
        
        void main(void) {
            vec3 L = normalize(lightLocation - vertexPosition);
            vec3 V = normalize(eyeLocation - vertexPosition);
            vec3 H = normalize(L+V);
            float NdotH = max(dot(vertexNormal, H), 0.0);
            float NdotL = max(dot(vertexNormal, L), 0.0);
            float NHpow = pow(NdotH,5.0);
            vColor = ambiRGB + diffRGB * NdotL + specRGB * NHpow;
            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0); // use the untransformed position
            //vColor = vertexColor;
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context



            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); // get pointer to vertex shader input
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexNormalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal"); // get pointer to vertex shader input
                gl.enableVertexAttribArray(vertexNormalAttrib); // input to shader from array

                //vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                //gl.enableVertexAttribArray(vertexColorAttrib);
                ambiColorAttrib = gl.getAttribLocation(shaderProgram, "ambiRGB");
                gl.enableVertexAttribArray(ambiColorAttrib);
                diffColorAttrib = gl.getAttribLocation(shaderProgram, "diffRGB");
                gl.enableVertexAttribArray(diffColorAttrib);
                specColorAttrib = gl.getAttribLocation(shaderProgram, "specRGB");
                gl.enableVertexAttribArray(specColorAttrib);
                shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
                shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
                shaderProgram.eyeLocationUniform = gl.getUniformLocation(shaderProgram, "eyeLocation");
                gl.uniform3fv(shaderProgram.eyeLocationUniform, eye);
                shaderProgram.lightLocationUniform = gl.getUniformLocation(shaderProgram, "lightLocation");
                gl.uniform3fv(shaderProgram.lightLocationUniform, lightLocation);

                mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
                mat4.perspective(pMatrix, 90*(3.14/180), 600/600, 0.5, 1.5);

                var translation = vec3.create();
                vec3.set(translation, 0.25, 0, 0);
                //mat4.translate(mvMatrix, mvMatrix, translation);
                setMatrixUniforms();

                console.log(mvMatrix);
                setMatrixUniforms();
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

var selectedSphere = 0;

function highlightSelectedSphere(){
    var startOffset = sphereOffsetArray[selectedSphere];
    var endOffset = sphereOffsetArray[selectedSphere + 1];
    for(var i = startOffset; i<=endOffset; i++){
        sphereDiffColorArray[i] = 1.0;
    }
    bindSphereBuffers();
    drawScene();
}

var currentlyPressedKeys = {};
function handleKeyDown(){
    currentlyPressedKeys[event.keyCode] = true;
    if (currentlyPressedKeys[27]) {//reset eye position if esc pressed
        vec3.set(eye, 0.5, 0.5, -0.5);
        vec3.set(lookAt, 0.5, 0.5, 1);
        vec3.set(lookUp, 0, 1, 0);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}

function handleKeys(){
    if(currentlyPressedKeys[65]){//a
        vec3.add(eye, eye, new vec3.fromValues(0.01,0,0));
        vec3.add(lookAt, lookAt, new vec3.fromValues(0.01,0,0));
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[68]){//d
        vec3.add(eye, eye, new vec3.fromValues(-0.01,0,0));
        vec3.add(lookAt, lookAt, new vec3.fromValues(-0.01,0,0));
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[81]){//q
        vec3.add(eye, eye, new vec3.fromValues(0.0,0.01,0));
        vec3.add(lookAt, lookAt, new vec3.fromValues(0.0,0.01,0));
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[69]){//e
        vec3.add(eye, eye, new vec3.fromValues(0.0,-0.01,0));
        vec3.add(lookAt, lookAt, new vec3.fromValues(0.0,-0.01,0));
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[87]){//w
        var translation = vec3.create();
        vec3.set(translation, 0.0, 0.0, 0.01);
        mat4.translate(mvMatrix, mvMatrix, translation);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[83]){//s
        var translation = vec3.create();
        vec3.set(translation, 0.0, 0.0, -0.01);
        mat4.translate(mvMatrix, mvMatrix, translation);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[65]){//A
        vec3.rotateY(lookAt, lookAt, eye, 0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[68]){//D
        vec3.rotateY(lookAt, lookAt, eye, -0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[87]){//W
        vec3.rotateX(lookAt, lookAt, eye, -0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[83]){//S
        vec3.rotateX(lookAt, lookAt, eye, 0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[81]){//Q
        vec3.rotateZ(lookUp, lookUp, eye, -0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[16] && currentlyPressedKeys[69]){//E
        vec3.rotateZ(lookUp, lookUp, eye, 0.02);
        mat4.lookAt(mvMatrix, eye, lookAt, lookUp);
        setMatrixUniforms();
    }
    if(currentlyPressedKeys[38]){//up

        if(selectedSphere > 4)
            selectedSphere = 0;
        else
            selectedSphere ++;
        highlightSelectedSphere();
    }
    if(currentlyPressedKeys[40]){//down

    }
}

function tick(){
    requestAnimationFrame(tick);
    handleKeys();
    drawScene();
}

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try

    catch(e) {
        console.log(e);
    } // end catch

} // end setupWebGL

function main() {

    setupWebGL(); // set up the webGL environment
    setupShaders();
    //initTexture();
    loadTriangleData();
    loadSphereData();

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
} // end main