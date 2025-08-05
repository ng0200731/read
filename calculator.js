// Area and Cost Calculation Engine
window.Calculator = {
    
    // Main area calculation function
    calculateArea(shape, scale) {
        if (scale <= 0) {
            console.warn('Scale not set. Returning area in pixels.');
            return this.calculatePixelArea(shape);
        }
        
        const pixelArea = this.calculatePixelArea(shape);
        // Convert from square pixels to square millimeters
        const mmArea = pixelArea / (scale * scale);
        
        return mmArea;
    },

    // Calculate area in pixels
    calculatePixelArea(shape) {
        switch (shape.type) {
            case 'rectangle':
                return this.calculateRectangleArea(shape);
            
            case 'circle':
                return this.calculateCircleArea(shape);
            
            case 'polygon':
                return this.calculatePolygonArea(shape.points);
            
            case 'detected-contour':
                return this.calculateContourArea(shape);
            
            default:
                console.warn('Unknown shape type:', shape.type);
                return 0;
        }
    },

    calculateRectangleArea(shape) {
        return Math.abs(shape.width * shape.height);
    },

    calculateCircleArea(shape) {
        return Math.PI * shape.radius * shape.radius;
    },

    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    },

    calculateContourArea(shape) {
        if (shape.subType === 'rectangle' && shape.properties) {
            return shape.properties.width * shape.properties.height;
        } else if (shape.subType === 'circle' && shape.properties) {
            return Math.PI * shape.properties.radius * shape.properties.radius;
        } else if (shape.points) {
            return this.calculatePolygonArea(shape.points);
        }
        return 0;
    },

    // Perimeter calculations
    calculatePerimeter(shape, scale) {
        if (scale <= 0) {
            console.warn('Scale not set. Returning perimeter in pixels.');
            return this.calculatePixelPerimeter(shape);
        }
        
        const pixelPerimeter = this.calculatePixelPerimeter(shape);
        // Convert from pixels to millimeters
        const mmPerimeter = pixelPerimeter / scale;
        
        return mmPerimeter;
    },

    calculatePixelPerimeter(shape) {
        switch (shape.type) {
            case 'rectangle':
                return this.calculateRectanglePerimeter(shape);
            
            case 'circle':
                return this.calculateCirclePerimeter(shape);
            
            case 'polygon':
                return this.calculatePolygonPerimeter(shape.points);
            
            case 'detected-contour':
                return this.calculateContourPerimeter(shape);
            
            default:
                console.warn('Unknown shape type:', shape.type);
                return 0;
        }
    },

    calculateRectanglePerimeter(shape) {
        return 2 * (Math.abs(shape.width) + Math.abs(shape.height));
    },

    calculateCirclePerimeter(shape) {
        return 2 * Math.PI * shape.radius;
    },

    calculatePolygonPerimeter(points) {
        if (points.length < 2) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const dx = points[j].x - points[i].x;
            const dy = points[j].y - points[i].y;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        return perimeter;
    },

    calculateContourPerimeter(shape) {
        if (shape.subType === 'rectangle' && shape.properties) {
            return 2 * (shape.properties.width + shape.properties.height);
        } else if (shape.subType === 'circle' && shape.properties) {
            return 2 * Math.PI * shape.properties.radius;
        } else if (shape.points) {
            return this.calculatePolygonPerimeter(shape.points);
        }
        return 0;
    },

    // Cost calculation functions
    calculateBasicCost(area, costPerUnit) {
        return area * costPerUnit;
    },

    calculateTieredCost(area, tiers) {
        // tiers = [{ min: 0, max: 100, rate: 0.1 }, { min: 100, max: 500, rate: 0.08 }, ...]
        let totalCost = 0;
        let remainingArea = area;
        
        for (const tier of tiers) {
            if (remainingArea <= 0) break;
            
            const tierSize = tier.max - tier.min;
            const areaInTier = Math.min(remainingArea, tierSize);
            
            totalCost += areaInTier * tier.rate;
            remainingArea -= areaInTier;
        }
        
        return totalCost;
    },

    calculateComplexCost(shapes, costFormula) {
        // costFormula can be a function or object with different calculation methods
        if (typeof costFormula === 'function') {
            return costFormula(shapes);
        }
        
        if (typeof costFormula === 'object') {
            return this.applyComplexFormula(shapes, costFormula);
        }
        
        console.warn('Invalid cost formula provided');
        return 0;
    },

    applyComplexFormula(shapes, formula) {
        let totalCost = 0;
        
        shapes.forEach(shape => {
            const area = this.calculateArea(shape, formula.scale || 1);
            const perimeter = this.calculatePerimeter(shape, formula.scale || 1);
            
            let shapeCost = 0;
            
            // Base area cost
            if (formula.areaCost) {
                shapeCost += area * formula.areaCost;
            }
            
            // Perimeter cost (for cutting, etc.)
            if (formula.perimeterCost) {
                shapeCost += perimeter * formula.perimeterCost;
            }
            
            // Shape-specific multipliers
            if (formula.shapeMultipliers && formula.shapeMultipliers[shape.type]) {
                shapeCost *= formula.shapeMultipliers[shape.type];
            }
            
            // Complexity multiplier based on number of vertices
            if (formula.complexityMultiplier && shape.type === 'polygon') {
                const complexity = shape.points.length / 4; // Normalize to rectangle (4 points)
                shapeCost *= (1 + (complexity - 1) * formula.complexityMultiplier);
            }
            
            // Minimum cost per shape
            if (formula.minimumCost) {
                shapeCost = Math.max(shapeCost, formula.minimumCost);
            }
            
            totalCost += shapeCost;
        });
        
        // Setup cost (one-time cost regardless of shapes)
        if (formula.setupCost) {
            totalCost += formula.setupCost;
        }
        
        // Quantity discounts
        if (formula.quantityDiscounts && shapes.length > 1) {
            const discount = this.calculateQuantityDiscount(shapes.length, formula.quantityDiscounts);
            totalCost *= (1 - discount);
        }
        
        return totalCost;
    },

    calculateQuantityDiscount(quantity, discounts) {
        // discounts = [{ min: 5, discount: 0.05 }, { min: 10, discount: 0.1 }, ...]
        let maxDiscount = 0;
        
        for (const tier of discounts) {
            if (quantity >= tier.min && tier.discount > maxDiscount) {
                maxDiscount = tier.discount;
            }
        }
        
        return maxDiscount;
    },

    // Utility functions for measurements
    convertUnits(value, fromUnit, toUnit) {
        const conversions = {
            'mm': 1,
            'cm': 10,
            'm': 1000,
            'in': 25.4,
            'ft': 304.8
        };
        
        if (!conversions[fromUnit] || !conversions[toUnit]) {
            console.warn('Unsupported unit conversion');
            return value;
        }
        
        return (value * conversions[fromUnit]) / conversions[toUnit];
    },

    formatArea(area, unit = 'mm²', decimals = 2) {
        return `${area.toFixed(decimals)} ${unit}`;
    },

    formatPerimeter(perimeter, unit = 'mm', decimals = 2) {
        return `${perimeter.toFixed(decimals)} ${unit}`;
    },

    formatCost(cost, currency = '$', decimals = 2) {
        return `${currency}${cost.toFixed(decimals)}`;
    },

    // Statistical functions for multiple shapes
    calculateStatistics(shapes, scale) {
        if (shapes.length === 0) {
            return {
                totalArea: 0,
                totalPerimeter: 0,
                averageArea: 0,
                averagePerimeter: 0,
                minArea: 0,
                maxArea: 0,
                shapeCount: 0
            };
        }
        
        const areas = shapes.map(shape => this.calculateArea(shape, scale));
        const perimeters = shapes.map(shape => this.calculatePerimeter(shape, scale));
        
        const totalArea = areas.reduce((sum, area) => sum + area, 0);
        const totalPerimeter = perimeters.reduce((sum, perimeter) => sum + perimeter, 0);
        
        return {
            totalArea,
            totalPerimeter,
            averageArea: totalArea / shapes.length,
            averagePerimeter: totalPerimeter / shapes.length,
            minArea: Math.min(...areas),
            maxArea: Math.max(...areas),
            minPerimeter: Math.min(...perimeters),
            maxPerimeter: Math.max(...perimeters),
            shapeCount: shapes.length,
            shapeTypes: this.countShapeTypes(shapes)
        };
    },

    countShapeTypes(shapes) {
        const counts = {};
        shapes.forEach(shape => {
            counts[shape.type] = (counts[shape.type] || 0) + 1;
        });
        return counts;
    },

    // Validation functions
    validateShape(shape) {
        if (!shape || !shape.type) {
            return { valid: false, error: 'Shape must have a type' };
        }
        
        switch (shape.type) {
            case 'rectangle':
                if (!shape.width || !shape.height || shape.width <= 0 || shape.height <= 0) {
                    return { valid: false, error: 'Rectangle must have positive width and height' };
                }
                break;
            
            case 'circle':
                if (!shape.radius || shape.radius <= 0) {
                    return { valid: false, error: 'Circle must have positive radius' };
                }
                break;
            
            case 'polygon':
                if (!shape.points || shape.points.length < 3) {
                    return { valid: false, error: 'Polygon must have at least 3 points' };
                }
                break;
        }
        
        return { valid: true };
    },

    validateScale(scale) {
        if (!scale || scale <= 0) {
            return { valid: false, error: 'Scale must be a positive number' };
        }
        return { valid: true };
    }
};
