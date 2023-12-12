import V1Addon from '../v1-addon';
import { join } from 'path';
import type { Node } from 'broccoli-node-api';
import { readdirSync, writeFileSync, readFileSync } from 'fs';
import { pathExistsSync, removeSync } from 'fs-extra';
import { Funnel } from 'broccoli-funnel';
import { transform } from '@babel/core';
import { stripBadReexportsPlugin } from '../compat-utils';
import semver from 'semver';

export default class extends V1Addon {
  static shouldApplyAdapter(addonInstance: any) {
    // after (>=) 2.3.0, PR #316 was merged. https://github.com/DockYard/ember-composable-helpers/pull/316
    //  2.3.0: https://github.com/DockYard/ember-composable-helpers/blob/v2.3.0/index.js
    //  and the ember-composable-helpers' index.js has not been touched since then.
    //  5.0.0: https://github.com/DockYard/ember-composable-helpers/blob/v5.0.0/index.js
    return semver.lt(addonInstance.pkg.version, '2.3.0');
  }

  get v2Tree(): Node {
    // workaround for https://github.com/DockYard/ember-composable-helpers/issues/308
    // and https://github.com/DockYard/ember-composable-helpers/pull/302
    // and https://github.com/DockYard/ember-composable-helpers/pull/307
    return new MatchHelpers(super.v2Tree);
  }
}

class MatchHelpers extends Funnel {
  constructor(inputTree: Node) {
    super(inputTree, {});
  }

  async build() {
    await super.build();
    let appHelpersDir = join(this.outputPath, '_app_', 'helpers');
    let addonHelpersDir = join(this.inputPaths[0], 'helpers');

    for (let filename of readdirSync(appHelpersDir)) {
      if (!pathExistsSync(join(addonHelpersDir, filename))) {
        removeSync(join(appHelpersDir, filename));
      }
    }
    let src = readFileSync(join(this.inputPaths[0], 'index.js'), 'utf8');
    let plugins = [stripBadReexportsPlugin({ resolveBase: this.outputPath })];
    writeFileSync(join(this.outputPath, 'index.js'), transform(src, { plugins, configFile: false })!.code!);
  }
}
