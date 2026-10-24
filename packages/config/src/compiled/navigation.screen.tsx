/** @jsxImportSource @bedrock-core/ui-runtime */
import { CommonActions, createStackNavigator, createStaticNavigation, useLinkProps, type InitialState } from '@bedrock-core/navigation';
import type { DisplayText } from '@bedrock-core/i18n';
import { createContext, Panel, Screen, useContext, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { FRAME } from '@bedrock-core/ore-styled';
import { flattenGroups, flattenSchema, type ConfigDefinition } from '../server';
import { buildSectionTree, findSection, isPureSection, listEntries, type SectionNode } from '../config/schema';
import { CONFIG_SCOPES, type ConfigScope } from '../types';
import { i18n } from '../i18n';
import { MENU_ROWS, MenuListView, pageOf, type MenuListRow } from './menu.screen';
import { ScopePickerView, type PickerModel } from './picker.screen';

export interface ConfigNavigationModel {
  picker: PickerModel;
  scopes: readonly ConfigScope[];
  trail: (scope: ConfigScope, path: string) => DisplayText;
  onOpen?: (scope: ConfigScope, path?: string, list?: string) => unknown;
  onScopeBack?: (scope: ConfigScope) => unknown;
}

export interface ConfigNavigationProps {
  model?: ConfigNavigationModel;
  /** Ancestors followed by the selected menu, from validated owner parameters. */
  routes?: readonly string[];
}

/** Route names preserve dots and separators without conflating authored keys. */
export const sectionRoute = (scope: ConfigScope, path: string, page = 1): string => JSON.stringify([scope, path, page]);

/** The same menu ancestry seeds compilation and validated owner-side entry. */
export function sectionRoutes(scope: ConfigScope, root: SectionNode, path: string, page = 1): string[] {
  const routes = ['picker'];
  const segments = path === '' ? [] : path.split('.');

  for (let depth = 0; depth <= segments.length; depth++) {
    const prefix = segments.slice(0, depth).join('.');
    const section = findSection(root, prefix);

    if (section !== undefined && isPureSection(section)) {
      routes.push(sectionRoute(scope, prefix, prefix === path ? page : 1));
    }
  }

  return routes;
}

let registered: FunctionComponent<ConfigNavigationProps> | undefined;

export function registerConfigNavigation(screen: FunctionComponent<ConfigNavigationProps>): void { registered = screen; }

export function configNavigation(): FunctionComponent<ConfigNavigationProps> | undefined { return registered; }

/** Schema menus share one bounded native stack; live rosters, editors and writes cross the server. */
export function configNavigationScreen(definition: ConfigDefinition): FunctionComponent<ConfigNavigationProps> {
  const scopes = CONFIG_SCOPES.filter(scope => Object.keys(definition[scope] ?? {}).length > 0);
  const empty: ConfigNavigationModel = { picker: { trail: '', scopes, canReset: false }, scopes, trail: () => '' };
  const Model = createContext(empty);
  const screens: Record<string, { screen: FunctionComponent; if?: () => boolean }> = {};
  const entryStates: InitialState[] = [];

  const roots = new Map(scopes.map(scope => [scope, buildSectionTree(flattenSchema(definition[scope] ?? {}), flattenGroups(definition[scope] ?? {}))]));

  screens.picker = {
    screen: function ConfigPicker(): JSX.Element {
      const model = useContext(Model);
      const server = useLinkProps({ action: { type: 'NAVIGATE', payload: { name: sectionRoute('server', '') } } }).onPress;

      return (
        <ScopePickerView model={{ ...model.picker, scopePresses: {
          server: roots.get('server') !== undefined && isPureSection(roots.get('server')!) ? server : (): unknown => model.onOpen?.('server'),
          dimension: (): unknown => model.onOpen?.('dimension'),
          player: (): unknown => model.onOpen?.('player'),
        } }}
        />
      );
    },
  };

  let maxDepth = 1;

  const visit = (scope: ConfigScope, section: SectionNode): void => {
    if (isPureSection(section)) {
      maxDepth = Math.max(maxDepth, section.path === '' ? 1 : section.path.split('.').length + 1);
      const rows: { row: MenuListRow; path?: string; list?: string; local: boolean }[] = [
        ...section.children.map(child => ({
          row: { title: { translate: child.label }, ...child.description === undefined ? {} : { subtitle: { translate: child.description } } },
          path: child.path, local: isPureSection(child),
        })),
        ...listEntries(section).map(([key, entry]) => ({
          row: { title: { translate: entry.label }, ...entry.description === undefined ? {} : { subtitle: { translate: entry.description } } },
          list: key, local: false,
        })),
      ];
      const pages = Math.max(1, Math.ceil(rows.length / MENU_ROWS));

      for (let page = 1; page <= pages; page++) {
        const shown = pageOf(rows, page);
        const route = sectionRoute(scope, section.path, page);

        entryStates.push({ routes: sectionRoutes(scope, roots.get(scope)!, section.path, page).map(name => ({ name })) });

        screens[route] = {
          if: (): boolean => useContext(Model).scopes.includes(scope),
          screen: function ConfigSection(): JSX.Element {
            const model = useContext(Model);
            const back = useLinkProps({ action: CommonActions.goBack() }).onPress;
            const previous = useLinkProps({ action: { type: 'REPLACE', payload: { name: sectionRoute(scope, section.path, Math.max(1, page - 1)) } } }).onPress;
            const next = useLinkProps({ action: { type: 'REPLACE', payload: { name: sectionRoute(scope, section.path, Math.min(pages, page + 1)) } } }).onPress;
            const rowPresses = shown.rows.map((item) => {
              const local = useLinkProps({ action: { type: 'NAVIGATE', payload: { name: sectionRoute(scope, item.path ?? '') } } }).onPress;

              return item.local ? local : (): unknown => model.onOpen?.(scope, item.path, item.list);
            });

            return (
              <MenuListView
                capacity={Math.max(1, shown.rows.length)}
                model={{
                  trail: model.trail(scope, section.path), rows: shown.rows.map(item => item.row),
                  empty: { translate: i18n.key($ => $.config.empty) }, page, pages, rowPresses,
                  previousPage: previous, nextPage: next,
                  onBack: section.path === '' && scope !== 'server' ? (): unknown => model.onScopeBack?.(scope) : back,
                }}
              />
            );
          },
        };
      }
    }

    for (const child of section.children) { visit(scope, child); }
  };

  for (const [scope, root] of roots) { visit(scope, root); }

  const stack = createStackNavigator({ id: 'config:menus', initialRouteName: 'picker', screenOptions: { headerShown: false }, screens });
  const Navigation = createStaticNavigation(stack, {
    clientNavigation: { history: 'recent', entryStates, maxDepth, maxStates: 128, fallback: 'server' }, rootBackBehavior: 'caller-or-close',
  });

  return function ConfigNavigation({ model = empty, routes = ['picker'] }): JSX.Element {
    return <Screen><Panel width={FRAME.width} height={FRAME.height}><Model value={model}><Navigation initialState={{ index: routes.length - 1, routes: routes.map(name => ({ name })) }} /></Model></Panel></Screen>;
  };
}
