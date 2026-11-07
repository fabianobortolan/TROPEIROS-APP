import React from "react";

export default function PinchZoomIframe({ src, title }) {
  return (
    <div className="flex-1 relative bg-stone-100 overflow-hidden">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        style={{ border: 0 }}
      />
    </div>
  );
}