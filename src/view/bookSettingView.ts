// book-setting-view.ts
import { ItemView, WorkspaceLeaf, TFolder, TFile, setIcon, Notice } from 'obsidian';
import MyPlugin from '../main';
import { ConfirmDeleteModal } from '../model/deleteModal';
import { NewInspirationModal } from 'src/model/InspirationModal';

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
            this.createSetView();
            await this.showViewContent('大纲');
        }
    }

    // 显示全局灵感
    async showInspiration() {
        const inspirationPath = '@附件/灵感';
        const folder = this.app.vault.getAbstractFileByPath(inspirationPath);
        const inspirationTitle = this.containerEl.createEl('h2', {cls: 'view-title' });
        inspirationTitle.createEl('span', { text: '灵感' });
        const inspirationIcon = inspirationTitle.createEl('span'); 
        setIcon(inspirationIcon, 'plus');
        inspirationIcon.title = '添加灵感';
        inspirationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewInspirationModal()
        });

        if (folder instanceof TFolder) {
            for (const child of folder.children) {
                if (child instanceof TFile) {
                    const file = child;
                    const fileItem = this.containerEl.createEl('div', { cls: 'inspiration-item' });
                    fileItem.createEl('div', { text: child.name.replace(/\.md$/, ''), cls: 'file-title' });
                    const deleteButton = fileItem.createEl('div', { cls: 'deleteButtonPlus' });
                    setIcon(deleteButton, 'trash');
                    deleteButton.title = "删除灵感";


                    // 读取文件内容并展示部分内容
                    const fileContent = await this.app.vault.read(child);
                    const snippet = fileContent.split('\n').slice(0, 5).join('\n'); // 获取前五行
                    fileItem.createEl('p', { text: snippet });

                    fileItem.addEventListener('click', () => {
                        this.app.workspace.openLinkText(child.path, '', false);
                    });

                    deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.confirmDelete(file);
                    });
                }
            }
        } else {
            this.contentContainer.createEl('div', { text: '未找到灵感文件夹。' });
        }
    }

    async showNewInspirationModal() {
        const inspirationPath = '@附件/灵感';
        const folder = this.app.vault.getAbstractFileByPath(inspirationPath);
        // 添加类型守卫来检查 folder 是否为 TFolder 类型
        if (folder && folder instanceof TFolder) {
            const modal = new NewInspirationModal(this.app, folder, this, this.refresh);
            modal.open();
        } else {
            new Notice('文件夹未找到');
        }
    }

    async showViewContent(tabName: string) {
        this.contentContainer.empty();
        const settingFolderPath = `${this.plugin.folderPath}/设定/${tabName}`;
        this.app.vault.getAbstractFileByPath(settingFolderPath);
    }
    // 以渲染结果展示内容
    async displayContent () {
        this.contentContainer.empty();
    }
    
    // 创建界面
    createSetView() {
        const setMainContainer = this.containerEl.createDiv({ cls: 'set-main-container' });
        const itemContainer = setMainContainer.createDiv({ cls: 'item-container' });
        const listContainer = setMainContainer.createDiv({ cls: 'list-container' });
        const tabsContainer = setMainContainer.createDiv({ cls: 'tabs-container' });
        const tabsTop = tabsContainer.createDiv({ cls: 'tabs-top' });
        // const tabsBottom = tabsContainer.createDiv({ cls: 'tabs-bottom' });
        
        const tabs = ['大纲', '角色', '设定', '灵感'];
        const tabsIcon = ['list', 'user-cog', 'file-cog', 'lightbulb']

        tabs.forEach(tabName => {
            const tab = tabsTop.createEl('div', {cls: 'tab-button'});
            tab.addEventListener('click', () => this.showViewContent(tabName));
            const tabIcon = tab.createDiv();
            tab.createDiv({cls: 'tab-name', text: tabName});
            setIcon(tabIcon, tabsIcon[tabs.indexOf(tabName)]);
            tab.title = tabName;
        });
        // 取名助手按钮
        // const intitle = tabsBottom.createEl('div', {cls: 'tab-button'});
        // intitle.addEventListener('click', () => this.showViewContent(tabName));
        // const intitleIcon = intitle.createDiv();
        // intitle.createDiv({cls: 'tab-name', text: '取名'});
        // setIcon(intitleIcon, 'contact');
        // intitle.title = '取名助手';
    }
    // 删除文件或文件夹
    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this, this.refresh);
        modal.open();
    }
}

