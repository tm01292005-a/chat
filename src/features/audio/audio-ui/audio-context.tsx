"use client";

import React, { FC, createContext } from "react";

interface AudioContextProps {
  id: string;
  uploadFile: (files: File[]) => void;
}

const AudioContext = createContext<AudioContextProps | null>(null);

interface Prop {
  children: React.ReactNode;
  id: string;
}

export const AudioProvider: FC<Prop> = (props) => {
  return (
    <AudioContext.Provider
      value={{
        id: props.id,
      }}
    >
      {props.children}
    </AudioContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = React.useContext(AudioContext);
  if (!context) {
    throw new Error("AudioContext is null");
  }

  return context;
};
