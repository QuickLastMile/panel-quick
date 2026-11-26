import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // BackOffice sube el contenido de un Excel por Server Action (por
      // defecto el tope es 1 MB). Vercel corta el cuerpo en ~4.5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
