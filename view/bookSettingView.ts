// book-setting-view.ts
import { ItemView, WorkspaceLeaf, TFolder, TFile, TextComponent, ButtonComponent } from 'obsidian';
import MyPlugin from '../main';

export const VIEW_TYPE_BOOK_SETTING = 'book-setting';

export class BookSettingView extends ItemView {
    plugin: MyPlugin;
    tabsContainer: HTMLElement;
    contentContainer: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.icon = 'book-text';
    }

    getViewType(): string {
        return VIEW_TYPE_BOOK_SETTING;
    }

    getDisplayText(): string {
        return '书籍设定';
    }

    async onOpen() {
        this.containerEl.empty();
        this.contentContainer = this.containerEl.createDiv({ cls: 'setting-content' });
        await this.refresh();
    }
    
    async refresh() {
        this.contentContainer.empty(); // 仅清空书籍列表容器
        this.containerEl.empty();
        // 打开时判断是小说文件夹内还是根目录
        if (this.plugin.folderPath === '') {
            await this.showInspiration();
        } else {
            this.createTabs();
            await this.showViewContent('大纲');
        }
    }
    // 根据文件夹路径判断展现什么标签内容

    async showViewContent(tabName: string) {
        this.contentContainer.empty();
        const settingFolderPath = `${this.plugin.folderPath}/${tabName}`;
        const folder = this.app.vault.getAbstractFileByPath(settingFolderPath);

        if (folder instanceof TFolder) {
            folder.children.forEach(child => {
                if (child instanceof TFile) {
                    const fileItem = this.contentContainer.createEl('div', { cls: 'file-item' });
                    fileItem.createEl('span', { text: child.name });
                    fileItem.addEventListener('click', () => {
                        this.app.workspace.openLinkText(child.path, '', false);
                    });
                }
            });

            // 添加新建文件功能
            const newFileInput = new TextComponent(this.contentContainer);
            newFileInput.setPlaceholder('输入新设定文件名');
            new ButtonComponent(this.contentContainer)
                .setButtonText('新建')
                .onClick(async () => {
                    const fileName = newFileInput.getValue();
                    if (fileName) {
                        const filePath = `${settingFolderPath}/${fileName}.md`;
                        await this.app.vault.create(filePath, '');
                        await this.showViewContent(tabName);
                    }
                });
        }
    }

    // 显示全局灵感
    async showInspiration() {
        const inspirationPath = '@附件/灵感';
        const folder = this.app.vault.getAbstractFileByPath(inspirationPath);
        this.containerEl.createEl('h3', {text: '灵感', cls: 'view-title' });

        if (folder instanceof TFolder) {
            for (const child of folder.children) {
                if (child instanceof TFile) {
                    const fileItem = this.containerEl.createEl('div', { cls: 'file-item' });
                    fileItem.createEl('div', { text: child.name, cls: 'file-title' });

                    // 读取文件内容并展示部分内容
                    const fileContent = await this.app.vault.read(child);
                    const snippet = fileContent.split('\n').slice(0, 5).join('\n'); // 获取前五行
                    fileItem.createEl('p', { text: snippet });

                    fileItem.addEventListener('click', () => {
                        this.app.workspace.openLinkText(child.path, '', false);
                    });
                }
            }
        } else {
            this.contentContainer.createEl('div', { text: '未找到灵感文件夹。' });
        }
    }

    createTabs() {
        this.tabsContainer = this.containerEl.createDiv({ cls: 'setting-tabs' });
        const tabs = ['大纲', '角色', '设定', '灵感'];

        tabs.forEach(tabName => {
            const button = this.tabsContainer.createEl('button', { text: tabName });
            button.addEventListener('click', () => this.showViewContent(tabName));
        });
    }
}
