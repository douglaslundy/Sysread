// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { AmbientAudioPlayer, parseYouTubeVideoId } from "../src/modules/audio/ui/ambient-audio-player";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("ambient audio player", () => {
  it("accepts only supported YouTube URL formats", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://youtube.example/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("requires an explicit play, loops licensed audio, and persists preferences", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AmbientAudioPlayer />
      </NextIntlClientProvider>,
    );
    expect(play).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText("Track"), "deep-focus");
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(play).toHaveBeenCalledOnce();
    expect(document.querySelector("audio")).toHaveAttribute("loop");
    fireEvent.change(screen.getByLabelText("Ambient volume"), { target: { value: "62" } });
    await waitFor(() => expect(localStorage.getItem("readcoach:audio:v1")).toContain('"volume":62'));
    await userEvent.selectOptions(screen.getByLabelText("Track"), "none");
    expect(pause).toHaveBeenCalled();
  });

  it("embeds a user-provided YouTube track and persists its volume", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AmbientAudioPlayer />
      </NextIntlClientProvider>,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Track"), "youtube");
    await user.type(screen.getByLabelText("Video or music URL"), "https://youtu.be/dQw4w9WgXcQ");
    expect(screen.getByLabelText("Saved YouTube links")).toHaveTextContent("https://youtu.be/dQw4w9WgXcQ");
    const player = screen.getByTitle("YouTube music player") as HTMLIFrameElement;
    const postMessage = vi.spyOn(player.contentWindow!, "postMessage");
    expect(player).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Ambient volume"), { target: { value: "48" } });
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ args: [48], event: "command", func: "setVolume" }),
      "*",
    ));
    await waitFor(() => expect(localStorage.getItem("readcoach:audio:v1")).toContain('"volume":48'));
    expect(localStorage.getItem("readcoach:audio:v1")).toContain("youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("switch", { name: "Hide video and keep audio" }));
    expect(player).toHaveClass("is-audio-only");
    expect(player).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("switch", { name: "Show video" })).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(localStorage.getItem("readcoach:audio:v1")).toContain('"showYoutubeVideo":false'));
    expect(localStorage.getItem("readcoach:audio:v1")).toContain('"youtubeHistory":["https://youtu.be/dQw4w9WgXcQ"]');
  });

  it("restores the YouTube history and reloads a selected link", async () => {
    localStorage.setItem("readcoach:audio:v1", JSON.stringify({
      trackId: "youtube",
      volume: 35,
      youtubeHistory: ["https://youtu.be/aqz-KE-bpKQ", "https://youtu.be/dQw4w9WgXcQ"],
      youtubeUrl: "https://youtu.be/aqz-KE-bpKQ",
    }));
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AmbientAudioPlayer />
      </NextIntlClientProvider>,
    );

    const history = await screen.findByLabelText("Saved YouTube links");
    await userEvent.selectOptions(history, "https://youtu.be/dQw4w9WgXcQ");
    expect(screen.getByLabelText("Video or music URL")).toHaveValue("https://youtu.be/dQw4w9WgXcQ");
    expect(screen.getByTitle("YouTube music player")).toHaveAttribute("src", expect.stringContaining("dQw4w9WgXcQ"));
  });
});
