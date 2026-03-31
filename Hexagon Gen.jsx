/*Hexagon Grid Gen 
An automation script for Adobe Illustrator to create precise hexagonal grids.

Author : Nobu Design
Youtube : https://www.youtube.com/@nobudesign
Date : March 2026
Released under the MIT license
*/

var doc = app.activeDocument;
var previewGroup = null;
var prefsFile = new File(Folder.temp + "/HexGridGenPos.txt");
var debounceTimer = null; 
var currentSeed = Math.random(); // Seed to lock scattering pattern

function showDialog() {
    var win = new Window("dialog", "Hexagon Grid Gen");
    win.alignChildren = "fill";
    win.orientation = "column";
    win.spacing = 15;

    // --- Load Last Position ---
    if (prefsFile.exists) {
        prefsFile.open('r');
        var pos = prefsFile.read().split(',');
        if(pos.length === 2) win.location = [parseInt(pos[0]), parseInt(pos[1])];
        prefsFile.close();
    } else {
        win.center();
    }

    // --- Size & Orientation Panel ---
    var sizePnl = win.add("panel", undefined, "Size & Orientation");
    sizePnl.alignChildren = "left";
    sizePnl.margins = 15;

    var sizeGrp = sizePnl.add("group");
    sizeGrp.add("statictext", undefined, "Radius (pt):");
    var sizeInput = sizeGrp.add("edittext", undefined, "50");
    sizeInput.characters = 5;
    
    // Label for minimum radius requirement
    var minLabel = sizeGrp.add("statictext", undefined, "(min. 20 pt)");
    minLabel.graphics.foregroundColor = minLabel.graphics.newPen(minLabel.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5, 1], 1);

    var orientGrp = sizePnl.add("group");
    orientGrp.add("statictext", undefined, "Orientation:");
    var radioFlat = orientGrp.add("radiobutton", undefined, "Flat Topped");
    var radioPointy = orientGrp.add("radiobutton", undefined, "Pointy Topped");
    radioFlat.value = true;

    // --- Grid Settings Panel ---
    var optPnl = win.add("panel", undefined, "Grid Settings");
    optPnl.alignChildren = "left";
    optPnl.margins = 15;

    var autoFillCb = optPnl.add("checkbox", undefined, "Auto-fill Entire Artboard");
    autoFillCb.value = true;
    
    var manualGrp = optPnl.add("group");
    manualGrp.add("statictext", undefined, "Rows:");
    var rowInput = manualGrp.add("edittext", undefined, "10");
    rowInput.preferredSize.width = 50;
    manualGrp.add("statictext", undefined, "Cols:");
    var colInput = manualGrp.add("edittext", undefined, "10");
    colInput.preferredSize.width = 50;
    rowInput.enabled = colInput.enabled = false;
    
    // Scattering Settings
    var scatterGrp = optPnl.add("group");
    scatterGrp.add("statictext", undefined, "Scattering:");
    var scatterSlider = scatterGrp.add("slider", undefined, 0, 0, 100);
    var scatterInput = scatterGrp.add("edittext", undefined, "0");
    scatterInput.characters = 3;
    scatterGrp.add("statictext", undefined, "%");
    scatterSlider.preferredSize.width = 100;

    var isoCb = optPnl.add("checkbox", undefined, "Add Isometric Lines");
    isoCb.value = false;

    // --- Action Buttons ---
    var actionGrp = win.add("group");
    actionGrp.alignment = "fill";
    var btnGrp = actionGrp.add("group");
    btnGrp.alignment = "right";

    var okBtn = btnGrp.add("button", undefined, "Ok", {name: "ok"});
    var cancelBtn = btnGrp.add("button", undefined, "Cancel");

    // --- Footer ---
    var footerGrp = win.add("group");
    footerGrp.alignment = "center";
    footerGrp.add("statictext", undefined, "© nobudesign. visit my channel");

    // --- LOGIC FUNCTIONS ---

    function savePosition() {
        prefsFile.open('w');
        prefsFile.write(win.location[0] + "," + win.location[1]);
        prefsFile.close();
    }

    function startDebounce() {
        win.onIdle = function() {
            updatePreview();
            win.onIdle = null;
        };
    }

    function updatePreview() {
        if (previewGroup != null) {
            previewGroup.remove();
            previewGroup = null;
        }

        var radius = parseFloat(sizeInput.text) || 1;
        
        // Safety check: skip render if radius is below 20pt
        if (radius < 20) return; 

        var isPointy = radioPointy.value;
        var scatterPercent = parseFloat(scatterInput.text) || 0;
        var useIso = isoCb.value;
        var rows, cols;
        var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abBounds = artboard.artboardRect;

        if (autoFillCb.value) {
            var abWidth = Math.abs(abBounds[2] - abBounds[0]);
            var abHeight = Math.abs(abBounds[1] - abBounds[3]);
            if (isPointy) {
                cols = Math.ceil(abWidth / (Math.sqrt(3) * radius)) + 1;
                rows = Math.ceil(abHeight / (radius * 1.5)) + 1;
            } else {
                cols = Math.ceil(abWidth / (radius * 1.5)) + 1;
                rows = Math.ceil(abHeight / (Math.sqrt(3) * radius)) + 1;
            }
        } else {
            rows = parseInt(rowInput.text) || 1;
            cols = parseInt(colInput.text) || 1;
        }
        
        // Object limit protection (max 3000 items)
        if ((rows * cols) > 3000) return;

        // Use currentSeed to keep scattering consistent during non-scatter updates
        previewGroup = createHexGrid(radius, rows, cols, abBounds, isPointy, scatterPercent, useIso, currentSeed);
        app.redraw();
    }

    // --- EVENT LISTENERS ---

    sizeInput.onChange = function() {
        var val = parseFloat(this.text) || 0;
        if (val < 20) {
            this.text = "20"; // Auto-correct without alert
        }
        updatePreview();
    };

    sizeInput.onChanging = startDebounce;
    rowInput.onChanging = startDebounce;
    colInput.onChanging = startDebounce;

    // Update Seed only when Scattering value changes
    scatterInput.onChanging = function() {
        var val = parseFloat(this.text) || 0;
        scatterSlider.value = Math.min(val, 100);
        currentSeed = Math.random(); 
        startDebounce();
    };

    scatterSlider.onChanging = function() {
        scatterInput.text = Math.round(this.value).toString();
        currentSeed = Math.random(); 
        updatePreview();
    };

    isoCb.onClick = updatePreview;
    radioFlat.onClick = updatePreview;
    radioPointy.onClick = updatePreview;
    
    autoFillCb.onClick = function() {
        rowInput.enabled = colInput.enabled = !autoFillCb.value;
        updatePreview();
    }

    function handleArrows(e, inputField) {
        if (!inputField.enabled) return;
        var val = parseFloat(inputField.text) || 0;
        var step = ScriptUI.environment.keyboardState.shiftKey ? 10 : 1;
        if (e.keyName == "Up") {
            inputField.text = (val + step).toString();
            if (inputField === scatterInput) currentSeed = Math.random();
            updatePreview();
        } else if (e.keyName == "Down") {
            var minVal = (inputField === sizeInput) ? 20 : 1;
            inputField.text = Math.max(minVal, val - step).toString();
            if (inputField === scatterInput) currentSeed = Math.random();
            updatePreview();
        }
    }

    sizeInput.addEventListener("keydown", function(e) { handleArrows(e, sizeInput); });
    rowInput.addEventListener("keydown", function(e) { handleArrows(e, rowInput); });
    colInput.addEventListener("keydown", function(e) { handleArrows(e, colInput); });
    scatterInput.addEventListener("keydown", function(e) { handleArrows(e, scatterInput); });

    cancelBtn.onClick = function() { win.close(0); };
    okBtn.onClick = function() {
        savePosition();
        win.close(1);
    };

    updatePreview();
    var result = win.show();

    // Remove preview group if the window is closed via Cancel or 'X' button
    if (result != 1) {
        if (previewGroup != null) {
            previewGroup.remove();
            app.redraw();
        }
    } else {
        previewGroup = null; 
    }
}

// Simple Seeded Random Generator
function seededRandom(seed) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function createHexGrid(hexSize, rows, cols, abBounds, isPointy, scatter, useIso, seed) {
    var group = doc.groupItems.add();
    group.name = "Hexagon Grid";

    var hDist, vDist;
    if (isPointy) {
        hDist = Math.sqrt(3) * hexSize;
        vDist = hexSize * 1.5;
    } else {
        hDist = hexSize * 1.5;
        vDist = Math.sqrt(3) * hexSize;
    }

    var localSeed = seed;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var randVal = seededRandom(localSeed++); 
            if (randVal * 100 < scatter) continue;

            var xPos = c * hDist;
            var yPos = r * vDist;
            if (isPointy) {
                if (r % 2 == 1) xPos += hDist / 2;
            } else {
                if (c % 2 == 1) yPos += vDist / 2;
            }

            var cellGroup = group.groupItems.add();
            var hex = cellGroup.pathItems.polygon(0, 0, hexSize, 6);
            if (isPointy) hex.rotate(30); 
            hex.position = [xPos, -yPos];

            if (useIso) {
                var points = hex.pathPoints;
                for (var i = 0; i < 3; i++) {
                    var line = cellGroup.pathItems.add();
                    line.setEntirePath([points[i].anchor, points[i+3].anchor]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeColor = hex.strokeColor;
                    line.strokeWidth = hex.strokeWidth * 0.5;
                }
            }
            cellGroup.move(group, ElementPlacement.PLACEATEND);
        }
    }

    var abCenterX = (abBounds[0] + abBounds[2]) / 2;
    var abCenterY = (abBounds[1] + abBounds[3]) / 2;
    group.position = [abCenterX - (group.width / 2), abCenterY + (group.height / 2)];
    return group;
}

if (app.documents.length > 0) {
    showDialog();
} else {
    alert("Please open an Illustrator document first!");
}  