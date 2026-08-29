import fs from 'node:fs';
import fsp from 'node:fs/promises';

function copyLink(target, path) {
  fs.cpSync(target, path, { recursive: true, force: true });
}

const origSync = fs.symlinkSync.bind(fs);
fs.symlinkSync = (target, path, type) => {
  try {
    return origSync(target, path, type);
  } catch (error) {
    if (error && error.code === 'EPERM') {
      copyLink(target, path);
      return;
    }
    throw error;
  }
};

const orig = fs.symlink.bind(fs);
fs.symlink = (target, path, type, cb) => {
  if (typeof type === 'function') {
    cb = type;
    type = undefined;
  }
  orig(target, path, type, (error) => {
    if (error && error.code === 'EPERM') {
      try {
        copyLink(target, path);
        cb(null);
      } catch (copyError) {
        cb(copyError);
      }
      return;
    }
    cb(error);
  });
};

const origPromise = fsp.symlink.bind(fsp);
fsp.symlink = async (target, path, type) => {
  try {
    return await origPromise(target, path, type);
  } catch (error) {
    if (error && error.code === 'EPERM') {
      await fsp.cp(target, path, { recursive: true, force: true });
      return;
    }
    throw error;
  }
};
