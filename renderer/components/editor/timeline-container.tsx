import {createContainer} from 'unstated-next';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {TimelineClip} from 'common/types';
import {
  findPlaybackClipForSourceTime,
  getTimelineDuration,
  getTimelineTimeForClipSourceTime,
  getTimelineTimeForClipStart,
} from '../../../main/common/timeline';
import VideoTimeContainer from './video-time-container';
import VideoControlsContainer from './video-controls-container';

const makeClip = (startTime: number, endTime: number): TimelineClip => ({
  id: `${Date.now()}-${Math.random()}`,
  startTime,
  endTime,
  speed: 1,
});

const useTimeline = () => {
  const {startTime, endTime, currentTime, updateTime} = VideoTimeContainer.useContainer();
  const {isPaused, pause} = VideoControlsContainer.useContainer();
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [activeClipId, setActiveClipId] = useState<string>();
  const [isEdited, setIsEdited] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0);
  const timelineTimeRef = useRef(0);

  const updateTimelineTime = (time: number) => {
    timelineTimeRef.current = time;
    setTimelineTime(time);
  };

  useEffect(() => {
    if (isEdited || !(endTime > startTime)) {
      return;
    }

    const clip = makeClip(startTime, endTime);
    setClips([clip]);
    setSelectedId(clip.id);
    setActiveClipId(clip.id);
    updateTimelineTime(0);
  }, [startTime, endTime, isEdited]);

  const selectedClip = useMemo(() => clips.find(clip => clip.id === selectedId) ?? clips[0], [clips, selectedId]);
  const activeClip = useMemo(() => clips.find(clip => clip.id === activeClipId) ?? clips[0], [activeClipId, clips]);

  const commit = (nextClips: TimelineClip[], selectId?: string, nextTimelineTime?: number, nextActiveClipId?: string) => {
    setIsEdited(true);
    setClips(nextClips);
    setSelectedId(selectId ?? nextClips[0]?.id);

    const playbackClip = findPlaybackClipForSourceTime(nextClips, currentTime, activeClipId);
    setActiveClipId(nextActiveClipId ?? playbackClip?.id ?? selectId ?? nextClips[0]?.id);
    updateTimelineTime(nextTimelineTime ?? Math.min(getTimelineDuration(nextClips), timelineTimeRef.current));
  };

  const select = (id: string) => {
    setSelectedId(id);
  };

  const seek = (id: string, time: number, nextTimelineTime?: number) => {
    setSelectedId(id);
    setActiveClipId(id);
    const clip = clips.find(item => item.id === id);
    if (!clip) {
      return;
    }

    updateTime(Math.max(clip.startTime, Math.min(clip.endTime, time)));
    updateTimelineTime(nextTimelineTime ?? getTimelineTimeForClipSourceTime(clips, id, time));
  };

  useEffect(() => {
    if (!activeClip) {
      return;
    }

    if (isPaused || currentTime < activeClip.endTime - 0.04) {
      updateTimelineTime(getTimelineTimeForClipSourceTime(clips, activeClip.id, currentTime));
      const playbackClip = findPlaybackClipForSourceTime(clips, currentTime, activeClip.id);
      if (playbackClip && playbackClip.id !== activeClip.id) {
        setActiveClipId(playbackClip.id);
      }

      return;
    }

    const index = clips.findIndex(clip => clip.id === activeClip.id);
    const nextClip = clips[index + 1];
    if (nextClip) {
      setActiveClipId(nextClip.id);
      updateTime(nextClip.startTime);
      updateTimelineTime(getTimelineTimeForClipStart(clips, nextClip.id) ?? getTimelineDuration(clips));
    } else {
      pause();
      updateTime(activeClip.endTime);
      updateTimelineTime(getTimelineDuration(clips));
    }
  }, [activeClip, clips, currentTime, isPaused]);

  const split = () => {
    const index = clips.findIndex(clip => clip.id === selectedClip?.id);
    if (index === -1 || currentTime <= selectedClip.startTime + 0.05 || currentTime >= selectedClip.endTime - 0.05) {
      return;
    }

    const left = {...selectedClip, id: `${Date.now()}-left`, endTime: currentTime};
    const right = {...selectedClip, id: `${Date.now()}-right`, startTime: currentTime};
    commit([...clips.slice(0, index), left, right, ...clips.slice(index + 1)], right.id);
  };

  const remove = () => {
    if (clips.length <= 1 || !selectedClip) {
      return;
    }

    commit(clips.filter(clip => clip.id !== selectedClip.id));
  };

  const updateSelected = (updates: Partial<TimelineClip>) => {
    if (!selectedClip) {
      return;
    }

    commit(clips.map(clip => clip.id === selectedClip.id ? {...clip, ...updates} : clip), selectedClip.id);
  };

  const updateClip = (id: string, updates: Partial<TimelineClip>) => {
    commit(clips.map(clip => clip.id === id ? {...clip, ...updates} : clip), id);
  };

  return {
    clips, selectedClip, activeClip, isEdited, timelineTime, select, seek, split, remove, updateSelected, updateClip,
  };
};

const TimelineContainer = createContainer(useTimeline);
export default TimelineContainer;
