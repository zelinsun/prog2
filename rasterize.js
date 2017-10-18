/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttribute;
var tricolorBuffer;
var mvm = mat4.create();
var pm = mat4.create();
var lm = mat4.create();
var sphBufferSize = 0;
var tritrans = [-0.5, -0.5, 0];
var spetrans = [0.5, 0.5, 0];


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
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context\
    var e = [-0.5, 0.5, 0.5];
    var et = [0.5, 0.5, 0.5];
    var vu = [0,1,0];
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    mat4.perspective(45, canvas.width / canvas.height , 0.1, 100.0, pm);
    mat4.identity(mvm);
    mat4.translate(mvm, mvm, tritrans);
    mat4.lookAt(lm, e, et, vu);


    document.onkeydown = keyEvent;

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
var newx = 0.0;
var newy = 0.0;
var newz = 0.0;
var newrx = 0.0;
var newry = 0.0;
var newrz = 0.0;
function keyEvent(event) {
    var key = String.fromCharCode(event.keyCode);
    console.log(key);
    setupWebGL();
    switch(key){

        case "a":
            newry -= 0.1;
            mat4.rotate(mvm, mvm, newry, [0, 1, 0]);
            //fromYRotation(newry, mat4)
            break;
        case "c":
            newry += 0.1;
            mat4.rotate(mvm, mvm, newry, [0, 1, 0]);
            //fromYRotation(newry, mat4)
            break;
        case "e":
            newrx += 0.1;
            mat4.rotate(mvm, mvm, newrx, [1, 0, 0]);
            //fromYRotation(newry, mat4)
            break;
        case "b":
            newrx -= 0.1;
            mat4.rotate(mvm, mvm, newrx, [1, 0, 0]);
            //fromYRotation(newry, mat4)
            break;
        case "d":
            newrz -= 0.1;
            mat4.rotate(mvm, mvm, newrz, [0, 0, 1]);
            //fromYRotation(newry, mat4)
            break;
        case "f":
            newrz += 0.1;
            mat4.rotate(mvm, mvm, newrz, [0, 0, 1]);
            //fromYRotation(newry, mat4)
            break;
        case "A":
            newx -= 0.1;
            mat4.translate(mvm, mvm, [newx, 0, 0]);
            //mat4.translate(mvm, ver3, mvm)
            break;
        case "D":
            newx += 0.1;
            mat4.translate(mvm, mvm, [newx, 0, 0]);
            //mat4.translate(mvm, ver3, mvm)
            break;
        case "W":
            newz += 0.1;
            mat4.translate(mvm, mvm, [0, 0, newz]);
            //mat4.translate(mvm, ver3, mvm)
            break;
        case "S":
            newz -= 0.1;
            mat4.translate(mvm, mvm, [0, 0, newz]);
            //mat4.translate(mvm, ver3, mvm)
            break;
        case "Q":
            newy -= 0.1;
            mat4.translate(mvm, mvm, [0, newy, 0]);
            //mat4.translate(mvm, ver3, mvm)
            break;
        case "E":
            newy += 0.1;
            mat4.translate(mvm, mvm, [0, newy, 0.1]);
            //mat4.translate(mvm, ver3, mvm)
            break;

    }
    if(event.keyCode == 27){
        newx = 0; newy = 0; newz = 0;
    }
    reset();

}

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set

        var tricolArray = [];
        // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            var coordArray = []; // 1D array of vertex coords for WebGL
            var indexArray = []; // 1D array of vertex indices for WebGL
            var vtxBufferSize = 0; triBufferSize = 0;
            //vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                //tColor = inputTriangles[whichSet].material.diffuse;
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                tricolArray.push(inputTriangles[whichSet].material.diffuse[0],inputTriangles[whichSet].material.diffuse[1],inputTriangles[whichSet].material.diffuse[2]);
            } // end for vertices in set

            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris

            triBufferSize *= 3; // now total number of indices

            // console.log("coordinates: "+coordArray.toString());
            // console.log("numverts: "+vtxBufferSize);
            // console.log("indices: "+indexArray.toString());
            // console.log("numindices: "+triBufferSize);

            // send the vertex coords to webGL
            vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

            // send the triangle indices to webGL
            triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

            tricolorBuffer = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,tricolorBuffer); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(tricolArray),gl.STATIC_DRAW);

            setupShaders();
            renderTriangles();
        } // end for each triangle set
    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        varying lowp vec3 vColor;
        void main(void) {
            //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // all fragments are white
            gl_FragColor = vec4(vColor, 1.0);
        }`
    ;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexColor;

        uniform mat4 umvm;
        uniform mat4 upm;

        varying lowp vec3 vColor;

        void main(void) {
            //gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
            gl_Position = upm * umvm * vec4(vertexPosition, 1.0);
            vColor = vertexColor;
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
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexColorAttribute = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttribute);

                shaderProgram.pmUniform = gl.getUniformLocation(shaderProgram, "upm");
                shaderProgram.mvmUniform = gl.getUniformLocation(shaderProgram, "umvm");

                gl.uniformMatrix4fv(shaderProgram.pmUniform, false, pm);
                gl.uniformMatrix4fv(shaderProgram.mvmUniform, false, mvm);

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,tricolorBuffer); // activate
    gl.vertexAttribPointer(vertexColorAttribute,3,gl.FLOAT,false,0,0); // fee

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render


} // end render triangles

var latlimit = 45;
var longlimit = 45;

function loadSpheres() {
    var inputSpheres = getJSONFile(INPUT_SPHERES_URL,"spheres");

    if (inputSpheres != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var tricolArray = [];
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        mat4.translate(mvm, mvm, spetrans);

        for (var whichSet=0; whichSet<inputSpheres.length; whichSet++) {
            var verpos = [];
            var norm = [];
            var texcoor = [];
            var index = [];
            var colorarr = [];
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize);

            for (var latNumber = 0; latNumber <= latlimit; latNumber++) {
                var theta = latNumber * Math.PI / latlimit;
                var sinTheta = Math.sin(theta);
                var cosTheta = Math.cos(theta);
                for (var longNumber = 0; longNumber <= longlimit; longNumber++) {
                    var phi = longNumber * 2 * Math.PI / longlimit;
                    var sinPhi = Math.sin(phi);
                    var cosPhi = Math.cos(phi);
                    var first = (latNumber * (longlimit + 1)) + longNumber;
                    var second = first + longlimit + 1;

                    norm.push(cosPhi * sinTheta);
                    norm.push(cosTheta);
                    norm.push(sinPhi * sinTheta);
                    texcoor.push((1 - (longNumber / longlimit)));
                    texcoor.push((1 - (latNumber / latlimit)));
                    verpos.push(inputSpheres[whichSet].x - 0.5 + inputSpheres[whichSet].r * (cosPhi * sinTheta));
                    verpos.push(inputSpheres[whichSet].y - 0.5 + inputSpheres[whichSet].r * cosTheta);
                    verpos.push(inputSpheres[whichSet].z - 0.5 + inputSpheres[whichSet].r * (sinPhi * sinTheta));
                    colorarr.push(inputSpheres[whichSet].diffuse[0], inputSpheres[whichSet].diffuse[1], inputSpheres[whichSet].diffuse[2]);

                    if((longNumber < longlimit)&&(latNumber < latlimit)){
                        index.push(first);
                        index.push(second);
                        index.push(first + 1);
                        index.push(second);
                        index.push(second + 1);
                        index.push(first + 1);
                    }
                }
            }


            triBufferSize = index.length;

            //vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verpos),gl.STATIC_DRAW); // coords to that buffer

            // send the triangle indices to webGL
            //triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(index),gl.STATIC_DRAW); // indices to that buffer

            //triangleColorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,tricolorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorarr), gl.STATIC_DRAW);

            setupShaders();
            renderTriangles();

        }
    }
}

/* MAIN -- HERE is where execution begins after window load */

function main() {

    setupWebGL(); // set up the webGL environment
    reset();



} // end main


function reset(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    var triBufferSize = 0;
    loadTriangles(); // load in the triangles from tri file
    setupShaders(); // setup the webGL shaders
    renderTriangles(); // draw the triangles using webGL
    //loadSpheres();
}

