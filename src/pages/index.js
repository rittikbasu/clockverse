import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { TextGenerateEffect } from "@/components/text-generate-effect";

export default function Home() {
  const [data, setData] = useState({
    poem: "",
    poet: "",
    imageUrl: "",
  });
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  const fetchPoemAndImage = async () => {
    const currentTimeParam = new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(
      `/api/fetchData?time=${encodeURIComponent(
        currentTimeParam
      )}&tz=${encodeURIComponent(timeZoneName)}`
    );
    const data = await response.json();
    setData(data);
  };

  useEffect(() => {
    fetchPoemAndImage();
  }, []);

  useEffect(() => {
    let previousMinute = new Date().getMinutes();

    const interval = setInterval(() => {
      const currentMinute = new Date().getMinutes();
      const newTime = new Date().toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      });

      if (currentMinute !== previousMinute) {
        fetchPoemAndImage();
        previousMinute = currentMinute;
      }

      setCurrentTime(newTime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <title>clockverse - a poem for every minute</title>
      </Head>
      <div className="flex flex-col justify-center items-center h-dvh w-dvw">
        <div className="absolute top-12 md:top-36 left-1/2 transform -translate-x-1/2 z-50 md:text-6xl text-4xl">
          {currentTime}
        </div>
        {data.imageUrl && (
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/30 to-black/30 z-40"></div>
            <Image
              src={data.imageUrl}
              alt="Random Portrait"
              layout="fill"
              objectFit="cover"
              className=""
              priority
            />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-16 w-full flex justify-center items-center z-40">
              <TextGenerateEffect words={data.poem} />
            </div>
          </div>
        )}
        {data.poet && (
          <div className="absolute bottom-12 md:bottom-36 left-1/2 transform -translate-x-1/2 z-50 md:text-xl group">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-100/80 whitespace-nowrap italic group-hover:hidden">
              in the style of {data.poet}
            </span>
            <Link
              href="http://twitter.com/_rittik"
              className="hidden group-hover:block text-orange-300 tracking-widest hover:underline underline-offset-8"
            >
              by @_rittik
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
