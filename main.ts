import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile } from 'obsidian';
import { TocView, VIEW_TYPE_FILE_LIST } from './view/tocView';
import { BookshelfView, VIEW_TYPE_BOOKSHELF } from './view/bookShelfView';
import { BookSettingView, VIEW_TYPE_BOOK_SETTING } from './view/bookSettingView';

// 插件设置的接口
interface MyPluginSettings {
    // 姓名
    name: string;
    picturePath: string; // 新增图片路径设置项
    // 是否计算标点符号
    countPunctuation: boolean;
}

// 默认设置
const DEFAULT_SETTINGS: MyPluginSettings = {
    name: '',
    picturePath: '',
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
        .setName('姓名')
        .addText(text => {
            text.setValue(this.plugin.settings.name).onChange(async (value) => {
                this.plugin.settings.name = value;
                await this.plugin.saveSettings();
                this.plugin.refreshTocView(); 
            });
        });

        // 添加标点符号计数设置
        // ... 现有代码 ...

        // 添加图片路径输入（假设是相对路径或URL）
        new Setting(containerEl)
            .setName('头像图片路径')
            .addText(text => {
                text.setValue(this.plugin.settings.picturePath).onChange(async (value) => {
                    this.plugin.settings.picturePath = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshTocView(); 
                });
            });
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
        this.addRibbonIcon('folder-open', '目录', () => {
            this.activateView(VIEW_TYPE_FILE_LIST);
        });

        // 添加激活书架视图的功能区图标
        this.addRibbonIcon('book', '书架', () => {
            this.activateView(VIEW_TYPE_BOOKSHELF);
        });

        // 添加激活书架视图的功能区图标
        this.addRibbonIcon('book-text', '设定', () => {
            this.activateView(VIEW_TYPE_BOOK_SETTING);
        });

        this.registerView(
            VIEW_TYPE_FILE_LIST,
            (leaf: WorkspaceLeaf) => new TocView(leaf, this)
        );

        this.registerView(
            VIEW_TYPE_BOOKSHELF,
            (leaf: WorkspaceLeaf) => new BookshelfView(leaf, this)
        );

        this.registerView(
            VIEW_TYPE_BOOK_SETTING,
            (leaf: WorkspaceLeaf) => new BookSettingView(leaf, this)
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

        const booksettingView = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_SETTING)[0]?.view;
        if (booksettingView instanceof BookSettingView) {
            booksettingView.refresh();
        }
    }

    async activateView(viewType: string) {
        this.app.workspace.detachLeavesOfType(viewType);
        let centerLeaf = this.app.workspace.getMostRecentLeaf();
        if (viewType === VIEW_TYPE_FILE_LIST) {
            centerLeaf = this.app.workspace.getLeftLeaf(false);
        } else if (viewType === VIEW_TYPE_BOOK_SETTING) {
            centerLeaf = this.app.workspace.getRightLeaf(false);
        }
        if (centerLeaf) {
            await centerLeaf.setViewState({
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
        this.refreshTocView();
        this.refreshBookSettingView();
    }

    refreshTocView() {
        const tocView = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_LIST)[0]?.view as TocView;
        if (tocView) {
            tocView.updateTitle();
            tocView.refresh();
        }
    }
    refreshBookSettingView() {
        const bookSettingView = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_SETTING)[0]?.view as BookSettingView;
        if (bookSettingView) {
            bookSettingView.refresh();
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
