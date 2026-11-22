(() => {
  const config = window.__tutorialCameraConfig;
  if (!config || !navigator.mediaDevices) return;
  const canvas = document.createElement("canvas");
  canvas.width = config.width;
  canvas.height = config.height;
  const drawingContext = canvas.getContext("2d");
  let cardImage = null;
  let cardShownAt = 0;
  let isDrawing = false;

  const draw = () => {
    const background = drawingContext.createLinearGradient(0, 0, config.width, config.height);
    background.addColorStop(0, "#2b2f36");
    background.addColorStop(1, "#1b1e23");
    drawingContext.fillStyle = background;
    drawingContext.fillRect(0, 0, config.width, config.height);
    if (!cardImage) return;
    const isTurned = config.turnsCardCounterClockwise;
    const aspectRatio = cardImage.naturalWidth / cardImage.naturalHeight;
    const longSide = isTurned
      ? Math.min(config.width * config.cardHeightShare, (config.height * config.cardHeightShare) / aspectRatio)
      : config.height * config.cardHeightShare;
    const shortSide = longSide * aspectRatio;
    const progress = Math.min((performance.now() - cardShownAt) / config.slideMs, 1);
    const slideOffset = (1 - (1 - (1 - progress) ** 3)) * (isTurned ? config.width : config.height);
    drawingContext.save();
    drawingContext.translate(
      config.width / 2 + (isTurned ? slideOffset : 0),
      config.height / 2 + (isTurned ? 0 : slideOffset),
    );
    if (isTurned) drawingContext.rotate(-Math.PI / 2);
    drawingContext.shadowColor = "rgba(0, 0, 0, 0.5)";
    drawingContext.shadowBlur = 24;
    drawingContext.drawImage(cardImage, -shortSide / 2, -longSide / 2, shortSide, longSide);
    drawingContext.restore();
  };

  const startDrawing = () => {
    if (isDrawing) return;
    isDrawing = true;
    draw();
    setInterval(draw, config.frameIntervalMs);
  };

  window.__tutorialCamera = {
    showCard: (imageDataUrl) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          cardImage = image;
          cardShownAt = performance.now();
          resolve();
        };
        image.onerror = () => reject(new Error("Card image failed to load"));
        image.src = imageDataUrl;
      }),
    clear: () => {
      cardImage = null;
    },
  };

  const fakeDevice = {
    deviceId: config.deviceId,
    groupId: config.deviceId,
    kind: "videoinput",
    label: config.deviceLabel,
    toJSON: () => ({
      deviceId: config.deviceId,
      groupId: config.deviceId,
      kind: "videoinput",
      label: config.deviceLabel,
    }),
  };
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (!constraints || !constraints.video) return originalGetUserMedia(constraints);
    startDrawing();
    return canvas.captureStream(Math.round(1000 / config.frameIntervalMs));
  };
  navigator.mediaDevices.enumerateDevices = async () => {
    const devices = await originalEnumerateDevices().catch(() => []);
    return [...devices.filter((device) => device.kind !== "videoinput"), fakeDevice];
  };
})();
