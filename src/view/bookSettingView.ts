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
    currentTab = '大纲'; // 存储当前选中的tab
    setContentContainer: HTMLElement; // 声明为类属性

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
        this.containerEl.empty();
        if (this.plugin.folderPath === '') {
            await this.showInspiration();
        } else {
            const infoFilePath = `${this.plugin.folderPath}/信息.md`;
            const file = this.app.vault.getAbstractFileByPath(infoFilePath);
            
            if (file instanceof TFile) {
                const yamlHeader = this.getFileYaml(infoFilePath); // 确保这是一个解析 YAML 的函数
    
                // 等待 yamlHeader 完成解析后再访问其属性
                const resolvedYamlHeader = await yamlHeader;
                if (resolvedYamlHeader && resolvedYamlHeader.type === 'short-story') {
                    await this.shortStoryOutline();
                } else {
                    this.createSetView();
                    await this.showViewContent(this.currentTab);
                }
            } else {
                new Notice('未找到信息.md文件或文件路径不正确');
            }
        }
    }
    
    // 解析YAML头部的方法
    async getFileYaml(filePath: string) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            const fileContents = await this.app.vault.read(file);
            const yamlHeader = fileContents.split('---')[1]?.trim();
            const fileYaml = yamlHeader ? parseYaml(yamlHeader) : null;
            return fileYaml;
        } else {
            new Notice('文件未找到或文件路径不正确');
            return null;
        }
    }

    async shortStoryOutline() {
        const outlineContent = this.containerEl.createEl('div', { cls: 'outline-container' });
        const shortStoryOutlinePath = `${this.plugin.folderPath}/大纲.md`;
        const shortStoryOutline = this.app.vault.getAbstractFileByPath(shortStoryOutlinePath);
        // 显示大纲标题
        outlineContent.createEl('h2', { text: '大纲', cls: 'view-title' });
        const modifyButton = outlineContent.createEl('div', { cls: 'modify-button' });
        setIcon(modifyButton, 'pencil');
        modifyButton.addEventListener('click', () => {
            this.app.workspace.openLinkText(shortStoryOutlinePath, '', false);
        });
    
        if (shortStoryOutline instanceof TFile) {
            // 读取文件内容
            const fileContent = await this.app.vault.read(shortStoryOutline);
    
            // 创建一个新的 div 作为内容容器，并添加到主容器中
            const shortStoryToc = outlineContent.createDiv({ cls: 'outline-content' });
    
            // 确保内容容器是空的
            shortStoryToc.empty();
    
            // 渲染 Markdown 内容
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
                    this.displayInspirationItem(child);
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
        const settingFolder = this.app.vault.getAbstractFileByPath(settingFolderPath);
        if (settingFolder && settingFolder instanceof TFolder) {
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

        // 创建一个输入框
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

        // 更新settingFolderPath并显示内容的方法
        const updateAndDisplayList = (tabName: string) => {
            this.currentTab = tabName; // 更新当前选中的tab
            const currentSettingFolderPath = `${this.plugin.folderPath}/设定/${tabName}`;
            const currentSettingFolder = this.app.vault.getAbstractFileByPath(currentSettingFolderPath);

            // 清空现有内容
            listContentContainer.empty();

            if (currentSettingFolder && currentSettingFolder instanceof TFolder) {
                this.displayItems(listContentContainer, currentSettingFolder);
            } else {
                listContentContainer.createEl('div', { text: `未找到${tabName}文件夹` });
            }
        };

        listHeaderIcon.addEventListener('click', () => {
            const newCategoryName = inputCategoryName.value.trim();
            if (newCategoryName) {
                const currentSettingFolderPath = `${this.plugin.folderPath}/设定/${this.currentTab}`;
                this.app.vault.createFolder(`${currentSettingFolderPath}/${newCategoryName}`);
                new Notice(`Folder '${newCategoryName}' created.`);
                updateAndDisplayList(this.currentTab);
            } else {
                new Notice('请输入分类名称');
            }
        });

        // 默认加载大纲内容
        updateAndDisplayList(this.currentTab);

        tabs.forEach(tabName => {
            const tab = tabsTop.createEl('div', { cls: 'tab-button' });
            tabsArray.push(tab); // 存储tab的引用
            tab.addEventListener('click', () => {
                updateAndDisplayList(tabName);

                // 移除所有标签的selected类
                tabsArray.forEach(t => t.removeClass('selected'));

                // 为当前点击的标签添加selected类
                tab.addClass('selected');

                this.showViewContent(tabName);
            });

            // 为“大纲”标签添加selected类
            if (tabName === '大纲') {
                tab.addClass('selected'); // 给“大纲”按钮添加selected类
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
    
        // 添加删除按钮到文件项
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
            MarkdownRenderer.render(this.app, fileContent, setContentContainer, file.path, this);
            const modifyButton = this.setContentContainer.createEl('div', { cls: 'modify-button' });
            setIcon(modifyButton, 'pencil');
            modifyButton.addEventListener('click', () => {
                this.app.workspace.openLinkText(file.path, '', false);
            });
        });

        fileItem.dataset.path = file.path;
    }
    
    async showNewChapterModal(folder: TFolder) {
        const modal = new NewChapterModal(this.app, folder, this, '', this.refresh);
        modal.open();
    }

    async showNewItemModal(folderPath: string) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (folder && folder instanceof TFolder) {
            const modal = new NewItemModal(this.app, folder, this, this.refresh);
            modal.open();
        } else {
            new Notice(`文件夹未发现: ${folderPath}`);
        }
    }

    confirmDelete(fileOrFolder: TFile | TFolder) {
        const modal = new ConfirmDeleteModal(this.app, fileOrFolder, this, this.refresh);
        modal.open();
    }
}
