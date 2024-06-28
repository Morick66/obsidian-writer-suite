import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile } from 'obsidian';
import { TocView, VIEW_TYPE_FILE_LIST } from './view/tocView';
import { BookshelfView, VIEW_TYPE_BOOKSHELF } from './view/bookShelfView';

// 插件设置的接口
interface MyPluginSettings {
    countPunctuation: boolean;
}

// 默认设置
const DEFAULT_SETTINGS: MyPluginSettings = {
    countPunctuation: false,
}

// 插件设置面板
class MyPluginSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: '插件设置' });

        new Setting(containerEl)
            .setName('标点符号计数')
            .setDesc('标点符号计算为一个字符')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.countPunctuation)
                .onChange(async (value) => {
                    this.plugin.settings.countPunctuation = value;
                    await this.plugin.saveSettings();
                    // 设置更改时刷新视图
                    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_LIST)[0]?.view;
                    if (view instanceof TocView) {
                        view.refresh();
                    }
                }));
    }
}

// 主插件类
export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    folderPath: string; // 新增 folderPath

    async onload() {
        await this.loadSettings();

        // 添加具有所需图标名称的新功能区图标
        this.addRibbonIcon('folder-open', 'File List', () => {
            this.activateView(VIEW_TYPE_FILE_LIST);
        });

        // 添加激活书架视图的功能区图标
        this.addRibbonIcon('book', 'Bookshelf', () => {
            this.activateView(VIEW_TYPE_BOOKSHELF);
        });

        this.registerView(
            VIEW_TYPE_FILE_LIST,
            (leaf: WorkspaceLeaf) => new TocView(leaf, this)
        );

        this.registerView(
            VIEW_TYPE_BOOKSHELF,
            (leaf: WorkspaceLeaf) => new BookshelfView(leaf, this)
        );

        this.addSettingTab(new MyPluginSettingTab(this.app, this));

        this.registerEvent(this.app.vault.on('modify', this.handleFileChange.bind(this)));
        this.registerEvent(this.app.vault.on('create', this.handleFileChange.bind(this)));
        this.registerEvent(this.app.vault.on('delete', this.handleFileChange.bind(this)));

        this.folderPath = ''; // 初始化 folderPath
    }

    handleFileChange(file: TFile) {
        const tocView = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_LIST)[0]?.view;
        if (tocView instanceof TocView) {
            tocView.refresh();
        }

        const bookshelfView = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOKSHELF)[0]?.view;
        if (bookshelfView instanceof BookshelfView) {
            bookshelfView.refresh();
        }
    }

    async activateView(viewType: string) {
        this.app.workspace.detachLeavesOfType(viewType);

        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (rightLeaf) {
            await rightLeaf.setViewState({
                type: viewType,
                active: true,
                state: { icon: viewType === VIEW_TYPE_FILE_LIST ? 'folder-open' : 'book' }
            });

            this.app.workspace.revealLeaf(
                this.app.workspace.getLeavesOfType(viewType)[0]
            );
        }
    }

    async setFolderPath(path: string) {
        this.folderPath = path;
        await this.saveSettings();
        const tocView = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_LIST)[0]?.view as TocView;
        tocView.updateTitle();
        this.refreshTocView();
    }

    refreshTocView() {
        const tocView = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_LIST)[0]?.view as TocView;
        if (tocView) {
            tocView.refresh();
        }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_FILE_LIST);
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_BOOKSHELF);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
