// book-setting-view.ts
import { ItemView, WorkspaceLeaf, TFolder, TFile, setIcon, Notice, MarkdownRenderer, parseYaml } from 'obsidian';
import MyPlugin from '../main';
import { ConfirmDeleteModal } from '../model/deleteModal';
import { NewInspirationModal } from 'src/model/InspirationModal';
import { NewChapterModal } from 'src/model/newChapterModal';
import { NewItemModal } from 'src/model/newItemModal';

export const VIEW_TYPE_BOOK_SETTING = 'book-setting';

export class BookSettingView extends ItemView {
    plugin: MyPlugin;
    tabsContainer: HTMLElement;
    contentContainer: HTMLElement;
    currentTab = '大纲';
    setContentContainer: HTMLElement;

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
        const previousTab = this.currentTab; // 保存当前选中的 tab
        this.containerEl.empty();
        if (!this.plugin.folderPath) {
            await this.showInspiration();
        } else {
            const infoFilePath = `${this.plugin.folderPath}/信息.md`;
            const file = this.app.vault.getAbstractFileByPath(infoFilePath);
            
            if (file instanceof TFile) {
                try {
                    const yamlHeader = await this.getFileYaml(infoFilePath);
                    if (yamlHeader?.type === 'short-story') {
                        await this.shortStoryOutline();
                    } else {
                        this.createSetView();
                        this.currentTab = previousTab; // 恢复选中的 tab
                        await this.showViewContent(this.currentTab);
                    }
                } catch (error) {
                    new Notice('解析信息.md文件时出错');
                }
            } else {
                new Notice('未找到信息.md文件或文件路径不正确');
            }
        }
    }

    async getFileYaml(filePath: string) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            const fileContents = await this.app.vault.read(file);
            const yamlHeader = fileContents.split('---')[1]?.trim();
            return yamlHeader ? parseYaml(yamlHeader) : null;
        } else {
            new Notice('文件未找到或文件路径不正确');
            return null;
        }
    }

    async shortStoryOutline() {
        const outlineContent = this.containerEl.createEl('div', { cls: 'outline-container' });
        const shortStoryOutlinePath = `${this.plugin.folderPath}/大纲.md`;
        const shortStoryOutline = this.app.vault.getAbstractFileByPath(shortStoryOutlinePath);
        
        const setContentContainerTitle = outlineContent.createEl('h2', { text: '大纲', cls: 'set-content-title' });
        const modifyButton = setContentContainerTitle.createEl('div', { cls: 'modify-button' });
        setIcon(modifyButton, 'pencil');
        modifyButton.addEventListener('click', () => {
            this.app.workspace.openLinkText(shortStoryOutlinePath, '', false);
        });
    
        if (shortStoryOutline instanceof TFile) {
            const fileContent = await this.app.vault.read(shortStoryOutline);
            const shortStoryToc = outlineContent.createDiv({ cls: 'outline-content' });
            shortStoryToc.empty();
            MarkdownRenderer.render(this.app, fileContent, shortStoryToc, shortStoryOutlinePath, this);
        } else {
            new Notice('大纲文件未找到');
        }
    }

    async showInspiration() {
        const inspirationPath = '@附件/灵感';
        const folder = this.app.vault.getAbstractFileByPath(inspirationPath);
        
        const inspirationTitle = this.containerEl.createEl('h2', { cls: 'view-title' });
        inspirationTitle.createEl('span', { text: '灵感' });

        const inspirationIcon = inspirationTitle.createEl('span');
        setIcon(inspirationIcon, 'plus');
        inspirationIcon.title = '添加灵感';
        inspirationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewInspirationModal();
        });

        if (folder instanceof TFolder) {
            for (const child of folder.children) {
                if (child instanceof TFile) {
                    await this.displayInspirationItem(child);
                }
            }
        } else {
            this.contentContainer.createEl('div', { text: '未找到灵感文件夹。' });
        }
    }

    async displayInspirationItem(child: TFile) {
        const fileItem = this.containerEl.createEl('div', { cls: 'inspiration-item' });
        fileItem.createEl('div', { text: child.name.replace(/\.md$/, ''), cls: 'file-title' });

        const deleteButton = fileItem.createEl('div', { cls: 'deleteButtonPlus' });
        setIcon(deleteButton, 'trash');
        deleteButton.title = "删除灵感";

        const fileContent = await this.app.vault.read(child);
        const snippet = fileContent.split('\n').slice(0, 5).join('\n');
        fileItem.createEl('p', { text: snippet });

        fileItem.addEventListener('click', () => {
            this.app.workspace.openLinkText(child.path, '', false);
        });

        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(child);
        });
    }

    async showNewInspirationModal() {
        const inspirationPath = '@附件/灵感';
        const folder = this.app.vault.getAbstractFileByPath(inspirationPath);
        if (folder instanceof TFolder) {
            const modal = new NewInspirationModal(this.app, folder, this, this.refresh.bind(this));
            modal.open();
        } else {
            new Notice('文件夹未找到');
        }
    }

    async showViewContent(tabName: string) {
        this.contentContainer.empty();
        const settingFolderPath = `${this.plugin.folderPath}/设定/${tabName}`;
        const settingFolder = this.app.vault.getAbstractFileByPath(settingFolderPath);
        if (settingFolder instanceof TFolder) {
            this.displayItems(this.contentContainer, settingFolder);
        } else {
            this.contentContainer.createEl('div', { text: `未找到${tabName}文件夹` });
        }
    }

    createSetView() {
        const setMainContainer = this.containerEl.createDiv({ cls: 'set-main-container' });

        this.setContentContainer = setMainContainer.createDiv({ cls: 'item-container' });

        const listContainer = setMainContainer.createDiv({ cls: 'list-container' });
        const listHeaderContainer = listContainer.createDiv({ cls: 'list-container-header' });

        const categoryNameDiv = listHeaderContainer.createEl('div', { cls: 'category-input' });
        const inputCategoryName = categoryNameDiv.createEl('input', { placeholder: '分类名称' });

        const listHeaderIcon = listHeaderContainer.createEl('div', { cls: 'list-header-icon' });
        setIcon(listHeaderIcon, 'plus');

        const listContentContainer = listContainer.createDiv({ cls: 'list-container-main' });
        const tabsContainer = setMainContainer.createDiv({ cls: 'tabs-container' });
        const tabsTop = tabsContainer.createDiv({ cls: 'tabs-top' });

        const tabs = ['大纲', '角色', '设定', '灵感'];
        const tabsIcon = ['list', 'user-cog', 'file-cog', 'lightbulb'];
        const tabsArray: HTMLDivElement[] = [];

        const updateAndDisplayList = async (tabName: string) => {
            this.currentTab = tabName;
            const currentSettingFolderPath = `${this.plugin.folderPath}/设定/${tabName}`;
            const currentSettingFolder = this.app.vault.getAbstractFileByPath(currentSettingFolderPath);

            listContentContainer.empty();

            if (currentSettingFolder instanceof TFolder) {
                this.displayItems(listContentContainer, currentSettingFolder);
            } else {
                listContentContainer.createEl('div', { text: `未找到${tabName}文件夹` });
            }
        };

        listHeaderIcon.addEventListener('click', async () => {
            const newCategoryName = inputCategoryName.value.trim();
            if (newCategoryName) {
                const baseSettingFolderPath = `${this.plugin.folderPath}/设定`;
                const currentSettingFolderPath = `${baseSettingFolderPath}/${this.currentTab}`;
                const newCategoryPath = `${currentSettingFolderPath}/${newCategoryName}`;
        
                // 检查设定和大纲路径是否存在，如果不存在，递归创建
                await createFolderIfNotExists.call(this, baseSettingFolderPath);
                await createFolderIfNotExists.call(this, currentSettingFolderPath);
        
                // 创建新分类文件夹
                await this.app.vault.createFolder(newCategoryPath);
                new Notice(`创建分类——'${newCategoryName}'`);
                updateAndDisplayList(this.currentTab);
            } else {
                new Notice('请输入分类名称');
            }
        });
        
        // 递归创建文件夹，如果路径不存在
        async function createFolderIfNotExists(path: string) {
            const folder = this.app.vault.getAbstractFileByPath(path);
            if (!(folder instanceof TFolder)) {
                const parentPath = path.substring(0, path.lastIndexOf('/'));
                await createFolderIfNotExists.call(this, parentPath); // 递归创建父文件夹
                await this.app.vault.createFolder(path);
            }
        }

        updateAndDisplayList(this.currentTab);

        tabs.forEach(tabName => {
            const tab = tabsTop.createEl('div', { cls: 'tab-button' });
            tabsArray.push(tab);
            tab.addEventListener('click', async () => {
                await updateAndDisplayList(tabName);

                tabsArray.forEach(t => t.removeClass('selected'));
                tab.addClass('selected');

                await this.showViewContent(tabName);
            });

            if (tabName === this.currentTab) {
                tab.addClass('selected'); // 确保当前选中的 tab 高亮显示
            }

            const tabIcon = tab.createDiv();
            tab.createDiv({ cls: 'tab-name', text: tabName });
            setIcon(tabIcon, tabsIcon[tabs.indexOf(tabName)]);
            tab.title = tabName;
        });
    }

    displayItems(container: HTMLElement, folder: TFolder) {
        folder.children.forEach((child) => {
            const childContainer = container.createDiv({ cls: 'folder-item' });
            if (child instanceof TFile) {
                this.displayFile(childContainer, child);
            } else if (child instanceof TFolder) {
                this.displayFolder(childContainer, child);
            }
        });
    }

    displayFolder(container: HTMLElement, folder: TFolder) {
        const folderItem = container.createDiv({ cls: 'folder-item' });
        const folderHeader = folderItem.createEl('div', { cls: 'folder-header' });
        const folderName = folderHeader.createEl('div', { cls: 'folder-name' });
        const folderIcon = folderName.createEl('span');
        setIcon(folderIcon, 'folder-open');
        folderName.createSpan({ text: folder.name });
        
        const tocButton = folderHeader.createEl('div', { cls: 'tocButton' });

        const addButton = tocButton.createEl('button');
        setIcon(addButton, 'plus');
        addButton.title = "添加";
        addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewChapterModal(folder);
        });

        const deleteButton = tocButton.createEl('button');
        setIcon(deleteButton, 'trash');
        deleteButton.title = "删除分类";
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(folder);
        });

        const fileList = folderItem.createEl('ul', { cls: 'file-list' });
        fileList.style.display = 'block';
        folderHeader.addEventListener('click', () => {
            fileList.style.display = fileList.style.display === 'none' ? 'block' : 'none';
            setIcon(folderIcon, fileList.style.display === 'none' ? 'folder-minus' : 'folder-open');
        });

        const sortedChildren = folder.children.sort((a, b) => {
            if (a instanceof TFile && b instanceof TFile) {
                return a.stat.ctime - b.stat.ctime;
            } else if (a instanceof TFolder && b instanceof TFolder) {
                return a.name.localeCompare(b.name);
            } else if (a instanceof TFile) {
                return 1;
            } else {
                return -1;
            }
        });

        sortedChildren.forEach(file => {
            if (file instanceof TFile) {
                this.displayFile(fileList, file);
            } else if (file instanceof TFolder) {
                this.displayFolder(fileList.createEl('li'), file);
            }
        });
    }

    async displayFile(container: HTMLElement, file: TFile) {
        const fileItem = container.createEl('li', {cls: "chapter-title" });
        const fileHeader = fileItem.createEl('div', { cls: 'file-header' });
        const fileIcon = fileHeader.createEl('span');
        setIcon(fileIcon, 'file-text');
        const fileName = fileHeader.createEl('span');
        fileName.textContent = file.name.replace(/\.md$/, '');
    
        const deleteButton = fileItem.createEl('button', { cls: 'deleteButton' });
        setIcon(deleteButton, 'trash');
        deleteButton.title = "删除文件";
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(file);
        });

        fileName.addEventListener('click', async () => {
            const fileContent = await this.app.vault.read(file);
            const setContentContainer = this.containerEl.querySelector('.item-container') as HTMLElement;
            setContentContainer.empty();
            const setContentContainerTitle = setContentContainer.createEl('h2', { cls: 'set-content-title', text: file.name.replace(/\.md$/, '') });
            const setContentContainerMain = setContentContainer.createEl('div', { cls: 'set-content-container-main' });
            
            MarkdownRenderer.render(this.app, fileContent, setContentContainerMain, file.path, this);
            const modifyButton = setContentContainerTitle.createEl('div', { cls: 'modify-button' });
            setIcon(modifyButton, 'pencil');
            modifyButton.addEventListener('click', () => {
                this.app.workspace.openLinkText(file.path, '', false);
            });
        });

        fileItem.dataset.path = file.path;
    }
    
    async showNewChapterModal(folder: TFolder) {
        const modal = new NewChapterModal(this.app, folder, this, '', this.refresh.bind(this));
        modal.open();
    }

    async showNewItemModal(folderPath: string) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (folder instanceof TFolder) {
            const modal = new NewItemModal(this.app, folder, this, this.refresh.bind(this));
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${folderPath}`);
        }
    }

    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this, this.refresh.bind(this));
        modal.open();
    }
}
