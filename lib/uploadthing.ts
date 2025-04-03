import { generateReactHelpers } from "@uploadthing/react/hooks"; //this is diff
 
import type { OurFileRouter } from "@/app/api/uploadthing/core";
 
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();