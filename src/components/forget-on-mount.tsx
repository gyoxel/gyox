"use client";

import { useEffect } from "react";
import { forgetDeviceData } from "@/lib/forget-device-data";

/** On Connexion: whatever this device kept from an earlier account goes. */
export function ForgetOnMount() {
  useEffect(() => {
    void forgetDeviceData();
  }, []);
  return null;
}
