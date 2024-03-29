import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { Blurhash } from "react-blurhash";

import { TextGenerateEffect } from "@/components/text-generate-effect";

export default function Home() {
  const [data, setData] = useState({
    poem: "",
    poet: "",
    imageUrl: "",
    blurhash: "L9FFjRNJKQ_3~q4.xCRPK7^+M{V@",
    imageAlt: "",
  });
  const backupImageUrl =
    "https://images.unsplash.com/photo-1710976151734-72b48a6d66f4?q=80&w=2548&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const backupBlurhash = "LE9@L+~pM_M|?a%MR,M|IpRkWBNG";
  const backupImageAlt = "a group of people crossing a street in a city";
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [blurAmount, setBlurAmount] = useState(0);

  const handleImageBlur = (isLoading) => {
    const blurChange = isLoading ? 1 : -1;
    const blurLimit = isLoading ? 250 : 0;
    const intervalSpeed = isLoading ? 0.5 : 10;

    const blurInterval = setInterval(() => {
      setBlurAmount((prevBlur) => {
        if (
          (isLoading && prevBlur < blurLimit) ||
          (!isLoading && prevBlur > blurLimit)
        ) {
          return prevBlur + blurChange;
        } else {
          clearInterval(blurInterval);
          return blurLimit;
        }
      });
    }, intervalSpeed);
  };

  const decreaseBlur = () => {
    handleImageBlur(false);
  };

  const increaseBlur = () => {
    handleImageBlur(true);
  };

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
    const apiData = await response.json();

    if (apiData.imageUrl) {
      if (apiData.imageUrl === data.imageUrl) {
        setBlurAmount(0);
      } else {
        increaseBlur();
      }
      setData(apiData);
      localStorage.setItem("blurhash", apiData.blurhash);
    } else {
      if (data.imageUrl) {
        setData((prevData) => ({
          ...prevData,
          poem: apiData.poem,
          poet: apiData.poet,
        }));
      } else {
        setData({
          poem: apiData.poem,
          poet: apiData.poet,
          imageUrl: backupImageUrl,
          blurhash: backupBlurhash,
          imageAlt: backupImageAlt,
        });
        localStorage.setItem("blurhash", backupBlurhash);
        increaseBlur();
      }
    }
  };

  useEffect(() => {
    const savedBlurhash = localStorage.getItem("blurhash");
    if (savedBlurhash) {
      setData((prevData) => ({ ...prevData, blurhash: savedBlurhash }));
    }
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
        {data.imageUrl ? (
          <>
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/30 to-black/30 z-40"></div>
              <Image
                src={data.imageUrl}
                alt={data.imageAlt || "An image from Unsplash"}
                layout="fill"
                objectFit="cover"
                priority
                onLoadingComplete={decreaseBlur}
                style={{ filter: `blur(${blurAmount}px)` }}
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-16 w-full flex justify-center items-center z-40">
                <TextGenerateEffect words={data.poem} />
                {/* {data.imageAlt} */}
              </div>
            </div>
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
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-black opacity-40 z-40"></div>
            <Blurhash
              hash={data.blurhash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
              style={{ filter: "blur(20px)" }}
            />
          </>
        )}
      </div>
    </>
  );
}
