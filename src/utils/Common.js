
export function calculateWidthFromRatio(height, ratio, borderSizes = [0/*T*/, 0/*R*/, 0/*B*/, 0/*L*/]) {
    const [numerator, denominator] = ratio.split(':').map(Number);
    const width = (((height - (borderSizes[0] + borderSizes[2])) * numerator) / denominator) + (borderSizes[1] + borderSizes[3]);
    return width;
}
export function calculateHeightFromRatio(width, ratio, borderSizes = [0, 0, 0, 0]) {
    const [numerator, denominator] = ratio.split(':').map(Number);
    const height = (((width - (borderSizes[1] + borderSizes[3])) * denominator) / numerator) + (borderSizes[0] + borderSizes[2]);
    return height;
}
export function deleteIndex(array, index) {
    index = Number(index);
    if (!array.length || array.length < index + 1) return;
    array.splice(index, 1);
  }