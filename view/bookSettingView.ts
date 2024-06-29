// book-setting-view.ts
import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import MyPlugin from '../main';

export const VIEW_TYPE_BOOK_SETTING = 'book-setting';

export class BookSettingView extends ItemView {
    plugin: MyPlugin;
    // 假设有一个属性来存储标签页的引用
    tabsContainer: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.icon = 'book-text'; // 设置视图图标
    }

    getViewType(): string {
        return VIEW_TYPE_BOOK_SETTING; // 实现抽象方法，返回视图类型
    }

    getDisplayText(): string {
        return '书籍设定'; // 实现抽象方法，返回视图的显示文本
    }

    async onOpen() {
        const container = this.containerEl;
        container.empty();

        // 创建并添加标签页容器
        this.tabsContainer = this.createTabs();

        // 填充标签页内容
        await this.fillTabsContent();
    }

    createTabs(): HTMLElement {
        const tabsContainer = this.containerEl.createDiv({ cls: 'setting-tabs' });
        // 创建标签页按钮
        const tabButtons = ['大纲', '角色', '设定', '灵感'].map(text => {
            const button = tabsContainer.createEl('button', { text });
            button.addEventListener('click', () => this.showTabContent(text));
            return button;
        });

        // 初始时显示第一个标签页的内容
        this.showTabContent('大纲');

        return tabsContainer;
    }

    async fillTabsContent() {
        // 获取设定文件夹路径
        const settingFolderPath = this.plugin.folderPath;
        if (!settingFolderPath) return;

        // 为每个标签页创建内容容器
        const folders = ['大纲', '角色', '设定', '灵感'];
        folders.forEach((folderName) => {
            const folderPath = `${settingFolderPath}/${folderName}`;
            const folderEl = this.containerEl.createDiv({ cls: `folder-content-${folderName.toLowerCase()}` });
            // 这里实现加载文件夹内容的逻辑
        });
    }

    showTabContent(tabName: string) {
        // 根据点击的标签页名称，显示对应的内容
        // 这里实现切换显示内容的逻辑
    }
}