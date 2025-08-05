// Main Application Controller
class ImageAnalysisApp {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.scale = 1; // pixels per mm
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.currentTool = null;
        this.shapes = [];
        this.isCalibrating = false;
        this.calibrationPoints = [];
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupFileUpload();
        console.log('Image Analysis App initialized');
    }

    setupCanvas() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width - 20;
        this.canvas.height = rect.height - 20;
        
        if (this.image) {
            this.drawImage();
        }
    }

    setupEventListeners() {
        // File upload
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Calibration
        document.getElementById('calibrateBtn').addEventListener('click', () => {
            this.startCalibration();
        });

        document.getElementById('confirmCalibration').addEventListener('click', () => {
            this.confirmCalibration();
        });

        document.getElementById('cancelCalibration').addEventListener('click', () => {
            this.cancelCalibration();
        });

        // Tools
        document.getElementById('autoDetectBtn').addEventListener('click', () => {
            this.autoDetectShapes();
        });

        document.getElementById('rectangleToolBtn').addEventListener('click', () => {
            this.setTool('rectangle');
        });

        document.getElementById('circleToolBtn').addEventListener('click', () => {
            this.setTool('circle');
        });

        document.getElementById('polygonToolBtn').addEventListener('click', () => {
            this.setTool('polygon');
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllShapes();
        });

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.resetZoom();
        });

        // Cost calculation
        document.getElementById('calculateCostBtn').addEventListener('click', () => {
            this.calculateTotalCost();
        });

        // Export
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('exportImageBtn').addEventListener('click', () => {
            this.exportImage();
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    loadImage(src) {
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.resetZoom();
            this.drawImage();
            this.updateImageInfo();
            this.enableControls();
            
            // Hide overlay
            document.getElementById('canvasOverlay').classList.add('hidden');
        };
        img.src = src;
    }

    drawImage() {
        if (!this.image) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate image position and size
        const imgAspect = this.image.width / this.image.height;
        const canvasAspect = this.canvas.width / this.canvas.height;
        
        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
            drawWidth = this.canvas.width * this.zoom;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = this.canvas.height * this.zoom;
            drawWidth = drawHeight * imgAspect;
        }

        const x = (this.canvas.width - drawWidth) / 2 + this.panX;
        const y = (this.canvas.height - drawHeight) / 2 + this.panY;

        this.ctx.drawImage(this.image, x, y, drawWidth, drawHeight);
        
        // Draw shapes
        this.drawShapes();
        
        // Draw calibration points if calibrating
        if (this.isCalibrating) {
            this.drawCalibrationPoints();
        }
    }

    drawShapes() {
        // This will be implemented in canvas-tools.js
        if (window.CanvasTools) {
            window.CanvasTools.drawShapes(this.ctx, this.shapes);
        }
    }

    drawCalibrationPoints() {
        this.ctx.fillStyle = 'red';
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;

        this.calibrationPoints.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.fillText(`P${index + 1}`, point.x + 10, point.y - 10);
        });

        if (this.calibrationPoints.length === 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.calibrationPoints[0].x, this.calibrationPoints[0].y);
            this.ctx.lineTo(this.calibrationPoints[1].x, this.calibrationPoints[1].y);
            this.ctx.stroke();
        }
    }

    updateImageInfo() {
        const info = document.getElementById('imageInfo');
        if (this.image) {
            info.innerHTML = `
                <p><strong>Dimensions:</strong> ${this.image.width} × ${this.image.height} px</p>
                <p><strong>Aspect Ratio:</strong> ${(this.image.width / this.image.height).toFixed(2)}</p>
                <p><strong>Scale:</strong> ${this.scale > 0 ? (1/this.scale).toFixed(3) + ' px/mm' : 'Not calibrated'}</p>
            `;
        }
    }

    enableControls() {
        const buttons = [
            'calibrateBtn', 'autoDetectBtn', 'rectangleToolBtn', 
            'circleToolBtn', 'polygonToolBtn', 'clearAllBtn',
            'zoomInBtn', 'zoomOutBtn', 'resetZoomBtn',
            'calculateCostBtn', 'exportDataBtn', 'exportImageBtn'
        ];
        
        buttons.forEach(id => {
            document.getElementById(id).disabled = false;
        });
    }

    // Mouse event handlers
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isCalibrating) {
            this.addCalibrationPoint(x, y);
        } else if (this.currentTool) {
            // Tool-specific mouse handling will be in canvas-tools.js
            if (window.CanvasTools) {
                window.CanvasTools.handleMouseDown(x, y, this.currentTool, this);
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentTool && window.CanvasTools) {
            window.CanvasTools.handleMouseMove(x, y, this.currentTool, this);
        }
    }

    handleMouseUp(e) {
        if (this.currentTool && window.CanvasTools) {
            window.CanvasTools.handleMouseUp(this.currentTool, this);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= delta;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));
        this.updateZoomDisplay();
        this.drawImage();
    }

    // Calibration methods
    startCalibration() {
        this.isCalibrating = true;
        this.calibrationPoints = [];
        document.getElementById('canvasInstructions').textContent = 'Click two points to set scale';
        document.getElementById('calibrateBtn').textContent = 'Calibrating...';
        document.getElementById('calibrateBtn').disabled = true;
    }

    addCalibrationPoint(x, y) {
        if (this.calibrationPoints.length < 2) {
            this.calibrationPoints.push({ x, y });
            this.drawImage();
            
            if (this.calibrationPoints.length === 2) {
                document.getElementById('calibrationInput').style.display = 'block';
                document.getElementById('canvasInstructions').textContent = 'Enter the real measurement';
            }
        }
    }

    confirmCalibration() {
        const realMeasurement = parseFloat(document.getElementById('realMeasurement').value);
        if (!realMeasurement || realMeasurement <= 0) {
            alert('Please enter a valid measurement');
            return;
        }

        const p1 = this.calibrationPoints[0];
        const p2 = this.calibrationPoints[1];
        const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        this.scale = pixelDistance / realMeasurement; // pixels per mm
        
        this.isCalibrating = false;
        this.calibrationPoints = [];
        
        document.getElementById('calibrationInput').style.display = 'none';
        document.getElementById('realMeasurement').value = '';
        document.getElementById('calibrateBtn').textContent = 'Set Scale';
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('canvasInstructions').textContent = 'Scale calibrated successfully';
        
        this.updateScaleInfo();
        this.updateImageInfo();
        this.drawImage();
    }

    cancelCalibration() {
        this.isCalibrating = false;
        this.calibrationPoints = [];
        
        document.getElementById('calibrationInput').style.display = 'none';
        document.getElementById('realMeasurement').value = '';
        document.getElementById('calibrateBtn').textContent = 'Set Scale';
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('canvasInstructions').textContent = 'Calibration cancelled';
        
        this.drawImage();
    }

    updateScaleInfo() {
        const scaleInfo = document.getElementById('scaleInfo');
        if (this.scale > 0) {
            scaleInfo.innerHTML = `Scale: ${(1/this.scale).toFixed(3)} pixels per mm`;
            scaleInfo.style.display = 'block';
        }
    }

    // Tool methods
    setTool(tool) {
        this.currentTool = tool;
        
        // Update button states
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool + 'ToolBtn').classList.add('active');
        
        document.getElementById('canvasInstructions').textContent = `${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`;
    }

    autoDetectShapes() {
        if (window.ImageProcessor) {
            const detectedShapes = window.ImageProcessor.detectShapes(this.image, this.scale);
            this.shapes.push(...detectedShapes);
            this.drawImage();
            this.updateResults();
        }
    }

    clearAllShapes() {
        this.shapes = [];
        this.drawImage();
        this.updateResults();
    }

    // Zoom methods
    zoomIn() {
        this.zoom *= 1.2;
        this.zoom = Math.min(5, this.zoom);
        this.updateZoomDisplay();
        this.drawImage();
    }

    zoomOut() {
        this.zoom *= 0.8;
        this.zoom = Math.max(0.1, this.zoom);
        this.updateZoomDisplay();
        this.drawImage();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.drawImage();
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }

    // Results and calculations
    updateResults() {
        const resultsArea = document.getElementById('resultsArea');

        if (this.shapes.length === 0) {
            resultsArea.innerHTML = '<p class="no-results">No measurements yet</p>';
            return;
        }

        let html = '';
        this.shapes.forEach((shape, index) => {
            const area = this.calculateShapeArea(shape);
            const shapeClass = shape.type.replace('-', '');
            html += `
                <div class="result-item ${shapeClass}">
                    <h4>${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${index + 1}</h4>
                    <p>Area: ${area.toFixed(2)} mm²</p>
                    <p>Perimeter: ${this.calculateShapePerimeter(shape).toFixed(2)} mm</p>
                </div>
            `;
        });

        resultsArea.innerHTML = html;
    }

    calculateShapeArea(shape) {
        if (window.Calculator) {
            return window.Calculator.calculateArea(shape, this.scale);
        }
        return 0;
    }

    calculateShapePerimeter(shape) {
        if (window.Calculator) {
            return window.Calculator.calculatePerimeter(shape, this.scale);
        }
        return 0;
    }

    calculateTotalCost() {
        const costPerSqMm = parseFloat(document.getElementById('costPerSqMm').value);
        if (!costPerSqMm || costPerSqMm <= 0) {
            alert('Please enter a valid cost per square mm');
            return;
        }

        let totalArea = 0;
        this.shapes.forEach(shape => {
            totalArea += this.calculateShapeArea(shape);
        });

        const totalCost = totalArea * costPerSqMm;
        
        document.getElementById('totalCost').innerHTML = `
            <strong>Total Area:</strong> ${totalArea.toFixed(2)} mm²<br>
            <strong>Cost per mm²:</strong> $${costPerSqMm.toFixed(3)}<br>
            <strong>Total Cost:</strong> $${totalCost.toFixed(2)}
        `;
    }

    // Export methods
    exportData() {
        const data = {
            image: {
                width: this.image.width,
                height: this.image.height,
                scale: this.scale
            },
            shapes: this.shapes.map(shape => ({
                type: shape.type,
                area: this.calculateShapeArea(shape),
                perimeter: this.calculateShapePerimeter(shape),
                coordinates: shape.points || shape
            })),
            totalArea: this.shapes.reduce((sum, shape) => sum + this.calculateShapeArea(shape), 0)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'image-analysis-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = 'analyzed-image.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageAnalysisApp();
});
