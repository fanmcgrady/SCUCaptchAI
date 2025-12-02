/**
 * 生成任意shape的数组
 * @param {*} value - 填充值
 * @param  {...number} shape - 数组形状
 * @returns {Array}
 */
export function nShapeArray(value, ...shape) {
    if (shape.length === 0) return value;
    const result = new Array(shape[0]);
    const subShape = shape.slice(1);
    for (let i = 0; i < shape[0]; i++) {
        result[i] = nShapeArray(value, ...subShape);
    }
    return result;
}

/**
 * 从图片元素读取像素数据并转换为模型输入格式
 * @param {string} selector - 元素选择器
 * @param {number} width - 目标宽度
 * @param {number} height - 目标高度
 * @param {Object} options - 配置选项
 * @param {boolean} options.isClass - 是否使用class选择器（默认false使用id）
 * @param {number} options.normFactor - 归一化因子（默认255.0）
 * @returns {Array} - 4维数组 [1, height, width, 3]
 */
export function imRead(selector, width, height, options = {}) {
    const { isClass = false, normFactor = 255.0 } = options;
    
    const img = isClass
        ? document.getElementsByClassName(selector)[0]
        : document.getElementById(selector);
    
    if (!img) {
        throw new Error(`找不到图片元素: ${selector}`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // 创建 [1, height, width, 3] 的数组
    const array = nShapeArray(0, 1, height, width, 3);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
                array[0][y][x][c] = pixels[pixelIndex + c] / normFactor;
            }
        }
    }
    
    return array;
}

/**
 * 延时函数
 * @param {number} ms - 延时毫秒数
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
