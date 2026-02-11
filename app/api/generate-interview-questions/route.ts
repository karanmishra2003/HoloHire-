import { NextRequest} from "next/server";
import ImageKit from "imagekit";
import { cp } from "fs/promises";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "your_public_api_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "your_private_api_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_imagekit_id/",
});

export async function POST(req: NextRequest) {
 const formData = await req.formData();
 const file = formData.get("file") as File;
  
}
