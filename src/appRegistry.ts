import { IFCCF, IKernel, IVirtualFileSystem } from './types';
import notepad from '../apps/notepad';
import calc from '../apps/calc';
import cmd from '../apps/cmd';
import explorer from '../apps/explorer';
import regedit from '../apps/regedit';
import antivirus from '../apps/antivirus';
import control from '../apps/control';
import displayProperties from '../apps/displayProperties';
import minesweeper from '../apps/minesweeper';
import music from '../apps/music';
import solitaire from '../apps/solitaire';
import paint from '../apps/paint';
import userAccounts from '../apps/userAccounts';
import clearbatch from '../apps/clearbatch';
import securityCenter from '../apps/securityCenter';
import dateTimeProperties from '../apps/dateTimeProperties';
import systemProperties from '../apps/systemProperties';
import appManagement from '../apps/appManagement';

export type AppRunner = (args: unknown, FCCF: IFCCF, XP_API: IKernel, VFS: IVirtualFileSystem) => void;

export const AppRegistry: { [key: string]: AppRunner } = {
    notepad,
    calc,
    cmd,
    explorer,
    regedit,
    antivirus,
    control,
    displayProperties,
    minesweeper,
    music,
    solitaire,
    paint,
    userAccounts,
    clearbatch,
    securityCenter,
    dateTimeProperties,
    systemProperties,
    appManagement
};
