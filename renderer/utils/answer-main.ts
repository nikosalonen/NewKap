import {answerMain as bridgeAnswerMain} from './ipc';

const answerMain = <Data, Result>(channel: string, callback: (data: Data) => Result | Promise<Result>) => bridgeAnswerMain(channel, callback);

export default answerMain;
