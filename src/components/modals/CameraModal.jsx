import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { saveImageToIdb, formatDateTime } from "../../utils";

/**
 * 多肉相机组件（全屏模式）
 * 支持拍照、添加水印（自定义文字+时间戳）
 */
export function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [watermarkText, setWatermarkText] = useState("多肉记录");
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] = useState("portrait"); // "portrait" | "landscape"

  // 检测视频方向
  const detectOrientation = (video) => {
    if (!video || !video.videoWidth || !video.videoHeight) return "portrait";
    const aspectRatio = video.videoWidth / video.videoHeight;
    return aspectRatio > 1 ? "landscape" : "portrait";
  };

  // 启动摄像头
  useEffect(() => {
    let video = null;
    let handleLoadedMetadata = null;
    let handleOrientationChange = null;
    
    // 更新方向
    const updateOrientation = () => {
      if (videoRef.current) {
        const detectedOrientation = detectOrientation(videoRef.current);
        setOrientation(detectedOrientation);
      }
    };
    
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // 优先使用后置摄像头
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          video = videoRef.current;
          
          // 等待视频元数据加载后检测方向
          handleLoadedMetadata = () => {
            updateOrientation();
            setIsStreaming(true);
          };
          
          video.addEventListener("loadedmetadata", handleLoadedMetadata);
          // 监听尺寸变化（设备旋转时）
          video.addEventListener("resize", updateOrientation);
          
          // 如果已经加载，立即检测
          if (video.readyState >= 1) {
            handleLoadedMetadata();
          }
          
          // 监听设备方向变化
          handleOrientationChange = () => {
            // 延迟一下，等待视频尺寸更新
            setTimeout(updateOrientation, 100);
          };
          window.addEventListener("orientationchange", handleOrientationChange);
        }
      } catch (err) {
        alert(`无法访问摄像头：${err.message}`);
        onClose();
      }
    }

    startCamera();

    return () => {
      // 清理事件监听器
      if (video && handleLoadedMetadata) {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("resize", updateOrientation);
      }
      if (handleOrientationChange) {
        window.removeEventListener("orientationchange", handleOrientationChange);
      }
      // 清理摄像头流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onClose]);

  // 拍照
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // 设置画布尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 绘制视频帧
    ctx.drawImage(video, 0, 0);

    // 添加水印
    addWatermark(ctx, canvas.width, canvas.height);

    // 转换为Blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedImage(url);
      }
    }, "image/jpeg", 0.9);
  }

  // 添加水印
  function addWatermark(ctx, width, height) {
    const timestamp = formatDateTime(new Date().toISOString());
    const text = watermarkText.trim() || "多肉记录";
    const fullText = `${text} | ${timestamp}`;

    // 设置水印样式
    const fontSize = Math.max(16, width / 30); // 根据图片宽度自适应字体大小
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    // 计算文字位置（照片下方居中）
    const x = width / 2;
    const y = height - 20; // 距离底部20px

    // 绘制文字描边（黑色背景）
    ctx.strokeText(fullText, x, y);
    // 绘制文字（白色前景）
    ctx.fillText(fullText, x, y);
  }

  // 重新拍照
  function retake() {
    setCapturedImage(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }

  // 保存照片
  async function savePhoto() {
    if (!capturedImage || !canvasRef.current) return;

    setLoading(true);
    try {
      // 从canvas获取Blob
      const blob = await new Promise((resolve) => {
        canvasRef.current.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (blob) {
        // 保存到IndexedDB
        const key = await saveImageToIdb(blob);
        onCapture(key);
        onClose();
      }
    } catch (err) {
      alert(`保存失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // 取消
  function handleClose() {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* 顶部控制栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
        <button
          onClick={handleClose}
          className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
        >
          ✕
        </button>
        <div className="text-white font-medium">多肉相机</div>
        <div className="w-10" /> {/* 占位，保持居中 */}
      </div>

      {/* 水印文字输入（仅在未拍照时显示） */}
      {!capturedImage && (
        <div className="absolute top-16 left-0 right-0 z-10 px-4">
          <div className="mx-auto max-w-md">
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="输入自定义水印文字"
              className="w-full rounded-lg border border-white/30 bg-black/50 backdrop-blur px-3 py-2 text-sm text-white placeholder:text-white/60 focus:border-white/60 focus:outline-none"
            />
            <div className="mt-1 text-xs text-white/70 text-center">
              {watermarkText.trim() || "多肉记录"} | {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      )}

      {/* 视频预览或拍摄结果 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="拍摄结果"
            className={`${orientation === "landscape" ? "w-full h-auto" : "h-full w-auto"} object-contain`}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`${orientation === "landscape" ? "w-full h-auto" : "h-full w-auto"} object-contain`}
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="mb-2">正在启动摄像头...</div>
                </div>
              </div>
            )}
            {/* 方向指示器 */}
            {isStreaming && (
              <div className="absolute top-20 right-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white">
                {orientation === "landscape" ? "📱 横屏" : "📱 竖屏"}
              </div>
            )}
          </>
        )}
      </div>

      {/* 隐藏的canvas用于处理图片 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 底部操作按钮 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="mx-auto max-w-md">
          {capturedImage ? (
            <div className="flex gap-3">
              <button
                onClick={retake}
                disabled={loading}
                className="flex-1 rounded-xl border-2 border-white/80 bg-white/20 backdrop-blur px-4 py-3 text-sm font-medium text-white hover:bg-white/40 hover:border-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                重新拍摄
              </button>
              <button
                onClick={savePhoto}
                disabled={loading}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-semibold"
              >
                {loading ? "保存中..." : "保存到相册"}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="h-16 w-16 rounded-full bg-white border-4 border-white/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition"
              >
                <span className="text-2xl">📷</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

