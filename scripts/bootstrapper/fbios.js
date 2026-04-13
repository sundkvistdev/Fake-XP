async function bootstrapRootImage(imagePath) {
    const image = await fetch(imagePath);
    const vfs = await image.json();
}