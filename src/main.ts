/// <reference path="../typings/threejs/three.d.ts" />
/// <reference path="../typings/jquery.d.ts" />
/// <reference path="CanvasCurveRenderView.ts" />
/// <reference path="CurveRenderView.ts" />
/// <reference path="CurveEditView.ts" />
/// <reference path="Hermite.ts" />

var curveImage = new Image();
var curveEditView : Curves.CurveEditView;
var canvasCurveRenderView : Curves.CanvasCurveRenderView;
var curveRenderView : Curves.CurveRenderView;

function loadImage(e: any) {
	var filelist: FileList = e.target.files;
	if (filelist.length == 0) {
		return;	
	}
	
	var file = filelist[0];
	
	var reader = new FileReader();
	reader.onload = function (e: any) {
        if (curveRenderView) {
            curveRenderView.setTextureData(e.target.result);
        }
		curveImage.src = e.target.result;
	};
	
	reader.readAsDataURL(file);
}

$(function () {
    var useLinearCurveInterpolation = false;
    
	curveImage.onload = function () {
		curveEditView.setImage(curveImage);
        if (canvasCurveRenderView) {
            canvasCurveRenderView.setImage(curveImage);
        }
	}
	
	var curve = new Curves.Hermite();

    curve.addPoint(100, 100, 0, 10);
	curve.addPoint(150, 150, -10, -10);
    curve.addPoint(170, 90, 20, 10);
	curve.addPoint(200, 90, 15, 25);
	curve.addPoint(270, 200, 40, 0);
	curve.addPoint(130, 300, 0, -40);
    curve.generateTangentsNaturalSpline();

	curve.generateCurve();
	
	curveEditView = new Curves.CurveEditView($('#content').get(0), curve);
    if (false) {
        canvasCurveRenderView = new Curves.CanvasCurveRenderView($("#render").get(0));
    } else {
	   curveRenderView = new Curves.CurveRenderView($("#render").get(0));
    }
	
	curveEditView.render();
	
    if (canvasCurveRenderView) {
        canvasCurveRenderView.setCurve(curve);
        canvasCurveRenderView.render();
    } else {
        curveRenderView.setCurve(curve);
        curveRenderView.render();
    }
	
	$("#loadSourceImage").on("change", loadImage);
    
    curve.onChangeHandler(() => {
        curve.generateTangentsNaturalSpline();
        curve.generateCurve();
        curveEditView.render();
        curveRenderView.setCurve(curve);
    });
    
    $("#panButton").click(function () {
        curveEditView.activatePan();
    });
    
    $("#renderPanButton").click(function () {
        curveRenderView.activatePan();
    });
    
    $("#renderZoomButton").click(function () {
        curveRenderView.activateZoom();
    });
    
    $("#addPointsButton").click(function () {
        curveEditView.activateAddPoint();
    });
    
    $("#clearCurveButton").click(function () {
        curve.clearPoints();
    })
    
    $("#linearCurveInterpButton").click(function () {
        useLinearCurveInterpolation = !useLinearCurveInterpolation;
        
        curveEditView.toggleLinearCurveInterpolation(useLinearCurveInterpolation);
        curveRenderView.toggleLinearCurveInterpolation(useLinearCurveInterpolation);
        
        if (useLinearCurveInterpolation) {
            $("#linearCurveInterpButton").addClass("btn-success");
        } else {
            $("#linearCurveInterpButton").removeClass("btn-success");
        }
    });
});