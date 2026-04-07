#target illustrator

/*
  ================================================================================
  Script: Vector Halftone Gen 
  Description: Generates customizable vector halftone patterns with live preview. 
  Author: nobudesign 
  Date: April 2026
  ================================================================================
*/

main();

function main() {
    if (app.documents.length < 1) {
        alert("Please open a document first!");
        return;
    }
    
    var doc = app.activeDocument;
    var previewed = false;
    var isSaving = false;

    // --- SESSION SEED ---
    var sessionSeed = Math.floor(Math.random() * 5000); 

    // File setup for saving preferences
    var prefsFile = new File(Folder.userData + "/Nobu_Halftone_Prefs.json");

    // Default size from active artboard
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var abW = Math.abs(ab.artboardRect[2] - ab.artboardRect[0]);
    var abH = Math.abs(ab.artboardRect[1] - ab.artboardRect[3]);

    var conf = {
        shape: "Circle",
        type: "Linear",
        density: 30,
        ratio: 0.8,
        gradAngle: 90,
        pattRotation: 0,
        randomRemove: 0,
        customW: abW,
        customH: abH,
        winX: undefined, // Tambahan untuk posisi X
        winY: undefined  // Tambahan untuk posisi Y
    };

    // --- PERSISTENCE LOGIC ---
    var loadSettings = function() {
        if (prefsFile.exists) {
            try {
                prefsFile.open('r');
                var savedData = eval(prefsFile.read());
                prefsFile.close();
                if (savedData) {
                    for (var key in savedData) { conf[key] = savedData[key]; }
                }
            } catch (e) { /* Fail silently */ }
        }
    };

    var saveSettings = function(winPos) {
        try {
            if (winPos) {
                conf.winX = winPos[0];
                conf.winY = winPos[1];
            }
            prefsFile.open('w');
            prefsFile.write(conf.toSource());
            prefsFile.close();
        } catch (e) { alert("Error saving settings: " + e); }
    };

    loadSettings();

    // --- LOGIC FUNCTIONS ---
    var clearPreview = function() { 
        if (previewed) { 
            try { app.undo(); } catch (e) {} 
            previewed = false; 
        } 
    };

    var openURL = function(url) { 
        var html = new File(Folder.temp.absoluteURI + '/aisLink.html'); 
        html.open('w'); 
        html.write('<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' + url + '"></head><body></body></html>'); 
        html.close(); 
        html.execute(); 
    };

    var organicNoise = function(x, y) { 
        var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123; 
        return n - Math.floor(n); 
    };

    var drawHalftone = function() {
        var group = doc.activeLayer.groupItems.add();
        group.name = "Halftone_Preview";
        
        var rect = ab.artboardRect; 
        var w = conf.customW;
        var h = conf.customH;
        
        var centerX = (rect[0] + rect[2]) / 2;
        var centerY = (rect[1] + rect[3]) / 2;
        var spacing = w / conf.density;
        var gRad = (conf.gradAngle - 90) * Math.PI / 180;
        var gDirX = Math.cos(gRad), gDirY = Math.sin(gRad);
        var pRad = conf.pattRotation * Math.PI / 180;
        var cosP = Math.cos(pRad), sinP = Math.sin(pRad);
        
        var limit = Math.max(w, h) * 2; 
        var blackColor = new RGBColor();
        blackColor.red = 0; blackColor.green = 0; blackColor.blue = 0;
        
        for (var i = -limit/2; i < limit/2; i += spacing) {
            for (var j = -limit/2; j < limit/2; j += spacing) {
                
                if (conf.randomRemove > 0) {
                    var nVal = (organicNoise((i + sessionSeed)/40.0, (j + sessionSeed)/40.0));
                    if (nVal < (conf.randomRemove / 100)) continue;
                }
                
                var posX = centerX + (i * cosP - j * sinP);
                var posY = centerY + (i * sinP + j * cosP);
                
                if (posX < centerX - w/2 || posX > centerX + w/2 || posY > centerY + h/2 || posY < centerY - h/2) continue;
                
                var factor = 0;
                if (conf.type === "Radial") {
                    var maxDist = Math.sqrt(Math.pow(w/2, 2) + Math.pow(h/2, 2));
                    var dist = Math.sqrt(Math.pow(posX - centerX, 2) + Math.pow(posY - centerY, 2));
                    factor = 1 - (dist / maxDist);
                } else {
                    var relX = posX - centerX, relY = posY - centerY;
                    var projection = (relX * gDirX + relY * gDirY);
                    var maxProj = (w/2 * Math.abs(gDirX) + h/2 * Math.abs(gDirY));
                    factor = (projection + maxProj) / (maxProj * 2);
                }
                factor = Math.max(0, Math.min(1, factor));
                var size = spacing * conf.ratio * factor;
                if (size < 0.2) continue;
                
                var item = (conf.shape === "Circle") ? 
                    group.pathItems.ellipse(posY + size/2, posX - size/2, size, size) : 
                    group.pathItems.rectangle(posY + size/2, posX - size/2, size, size);
                
                if (conf.shape === "Square") item.rotate(conf.pattRotation);
                item.filled = true; item.stroked = false;
                item.fillColor = blackColor;
            }
        }
        previewed = true; app.redraw();
    };

    // --- UI DESIGN ---
    var win = new Window("dialog", "Vector Halftone");
    win.alignChildren = "fill"; win.spacing = 10; win.margins = 20;

    var pDim = win.add("panel", undefined, "Area Dimensions (px)");
    pDim.orientation = "row"; pDim.margins = 15; pDim.spacing = 10;
    pDim.add("statictext", undefined, "Width:");
    var tWidth = pDim.add("edittext", undefined, Math.round(conf.customW)); tWidth.preferredSize.width = 60;
    pDim.add("statictext", undefined, " Height:");
    var tHeight = pDim.add("edittext", undefined, Math.round(conf.customH)); tHeight.preferredSize.width = 60;

    var pAppear = win.add("panel", undefined, "Shape Settings");
    pAppear.orientation = "row"; pAppear.margins = 15; pAppear.alignChildren = "fill"; pAppear.spacing = 10;
    
    pAppear.add("statictext", undefined, "Shape:");
    var ddShape = pAppear.add("dropdownlist", undefined, ["Circle", "Square"]); 
    ddShape.selection = (conf.shape === "Circle") ? 0 : 1; 
    pAppear.add("statictext", undefined, " Mode:");
    var ddType = pAppear.add("dropdownlist", undefined, ["Linear", "Radial"]); 
    ddType.selection = (conf.type === "Linear") ? 0 : 1;

    var pCtrl = win.add("panel", undefined, "Geometry Settings");
    pCtrl.margins = 18; pCtrl.alignChildren = "fill"; pCtrl.spacing = 12;

    function addControl(parent, label, min, max, def, isFloat) {
        var g = parent.add("group");
        var lbl = g.add("statictext", undefined, label); lbl.preferredSize.width = 90;
        var sld = g.add("slider", undefined, isFloat ? def * 100 : def, min, max);
        sld.alignment = ["fill", "center"];
        var txt = g.add("edittext", undefined, def);
        txt.preferredSize.width = 45;
        return { sld: sld, txt: txt, isFloat: isFloat };
    }

    var cDens = addControl(pCtrl, "Density", 5, 150, conf.density, false);
    var cSize = addControl(pCtrl, "Scale", 10, 150, conf.ratio, true);
    var cPRot = addControl(pCtrl, "Rotation °", 0, 360, conf.pattRotation, false);
    var cGDir = addControl(pCtrl, "Gradient °", 0, 360, conf.gradAngle, false);
    var cRand = addControl(pCtrl, "Jitter", 0, 95, conf.randomRemove, false);

    var btnGroup = win.add("group"); 
    btnGroup.alignment = "right"; btnGroup.spacing = 10;
    var btnCancel = btnGroup.add("button", undefined, "Cancel", {name: "cancel"});
    var btnOk = btnGroup.add("button", undefined, "Apply", {name: "ok"});

    var footerGrp = win.add("group");
    footerGrp.alignment = "center";
    var linkLabel = footerGrp.add("statictext", undefined, "© 2026 nobudesign • Click to visit YouTube");
    linkLabel.graphics.foregroundColor = win.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4, 1], 1);

    var processUpdate = function() {
        conf.customW = parseFloat(tWidth.text) || 100;
        conf.customH = parseFloat(tHeight.text) || 100;
        conf.shape = ddShape.selection.text;
        conf.type = ddType.selection.text;
        conf.density = parseInt(cDens.txt.text) || 10;
        conf.ratio = parseFloat(cSize.txt.text) || 0.1;
        conf.pattRotation = parseInt(cPRot.txt.text) || 0;
        conf.gradAngle = parseInt(cGDir.txt.text) || 0;
        conf.randomRemove = parseInt(cRand.txt.text) || 0;
        
        cGDir.sld.enabled = cGDir.txt.enabled = (conf.type === "Linear");

        clearPreview(); 
        drawHalftone();
    };

    var setupEvents = function(obj) {
        obj.sld.onChanging = function() {
            obj.txt.text = obj.isFloat ? (this.value / 100).toFixed(2) : Math.round(this.value);
            processUpdate();
        };
        obj.txt.onChange = function() {
            obj.sld.value = obj.isFloat ? parseFloat(this.text) * 100 : parseInt(this.text);
            processUpdate();
        };
        obj.txt.addEventListener("keydown", function(k) {
            var val = parseFloat(obj.txt.text) || 0;
            var step = obj.isFloat ? 0.05 : 1;
            if (k.keyName == "Up") val += step;
            else if (k.keyName == "Down") val -= step;
            else return;
            obj.txt.text = obj.isFloat ? val.toFixed(2) : Math.round(val);
            obj.sld.value = obj.isFloat ? val * 100 : val;
            processUpdate();
            k.preventDefault();
        });
    };

    var setupDimEvents = function(txtField) {
        txtField.addEventListener("keydown", function(k) {
            var val = parseFloat(txtField.text) || 0;
            if (k.keyName == "Up") val += 10;
            else if (k.keyName == "Down") val -= 10;
            else return;
            txtField.text = Math.round(val);
            processUpdate();
            k.preventDefault();
        });
        txtField.onChange = processUpdate;
    };

    setupDimEvents(tWidth); setupDimEvents(tHeight);
    setupEvents(cDens); setupEvents(cSize); setupEvents(cPRot); setupEvents(cGDir); setupEvents(cRand);
    
    ddShape.onChange = ddType.onChange = processUpdate;
    linkLabel.addEventListener("mousedown", function () { openURL('https://www.youtube.com/@nobudesign'); });

    btnOk.onClick = function() { 
        isSaving = true; 
        saveSettings([win.location.x, win.location.y]); 
        win.close(); 
    };

    btnCancel.onClick = function() { win.close(); };

    win.onClose = function() { 
        if (!isSaving) { 
            clearPreview(); 
        } 
        // last position
        saveSettings([win.location.x, win.location.y]);
        return true; 
    };

    win.onShow = function() { 
        processUpdate(); 
    };
    
    // --- POSITIONING LOGIC ---
    if (conf.winX !== undefined && conf.winY !== undefined) {
        win.location = [conf.winX, conf.winY];
    } else {
        win.center();
    }

    win.show();
}