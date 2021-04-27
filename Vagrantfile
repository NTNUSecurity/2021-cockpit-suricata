# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
  config.vagrant.plugins = ["vagrant-libvirt","vagrant-sshfs"]
  config.vm.box = "generic/ubuntu2004"
  #config.vm.box = "generic/fedora33"

  config.vm.network "forwarded_port", guest: 9090, host: 9090

  config.vm.provider :libvirt do |libvirt|
    libvirt.cpus = 2
    libvirt.memory = 4096
    libvirt.cpu_mode = "host-passthrough"
  end

  config.vm.synced_folder ".", "/suricata-module", type: "rsync",rsync__exclude: ["node_modules","package-lock.json","dist/","bots/",".vagrantfiles"]
  config.vm.synced_folder ".vagrantfiles/config", "/etc/suricata/", type: "rsync"

  config.vm.provision "shell", inline: <<-SHELL
    echo "root:secretpassword" | chpasswd
    sudo hostnamectl set-hostname cockpit

    export DISTRO=$(grep '^NAME' /etc/os-release | sed 's/NAME=//' | sed 's/\"//g')

    if [ $DISTRO == "Ubuntu" ]; then

      apt-get update
      apt-get install software-properties-common -y
      add-apt-repository ppa:oisf/suricata-stable
      apt-get update
      apt-get install -y cockpit-pcp speedtest-cli build-essential suricata sassc cockpit rpm npm nodejs libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi-dev libxtst-dev libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0 libgbm1 avahi-daemon avahi-discover avahi-utils libnss-mdns mdns-scan

    elif [ $DISTRO == "Fedora" ]; then

      echo "keepcache=1" >> /etc/dnf/dnf.conf
      sudo dnf install cockpit-pcp speedtest-cli cockpit suricata nodejs rpm-build rpmdevtools nss-mdns avahi sassc -y
      sudo systemctl enable --now avahi-daemon.service
      sudo systemctl enable --now cockpit.socket
      sudo systemctl enable --now suricata
      sudo firewall-cmd --add-service=cockpit
      sudo firewall-cmd --add-service=cockpit --permanent
    fi


    echo [Session] > /etc/cockpit/cockpit.conf
    echo IdleTimeout=0 >> /etc/cockpit/cockpit.conf
    systemctl restart cockpit
    tuned-adm profile virtual-host
    timedatectl set-timezone "Europe/Oslo"

    cd /suricata-module
    make
    #make install # Will ignore our module being developed remotaly via sshfs
    #npm install puppeteer
    #node test/pptr/main.js 127.0.0.1:9090 root secretpassword
  SHELL
  #config.vm.synced_folder "./dist", "/usr/share/cockpit/suricata", type: "nfs", nfs_version: 4
  config.vm.synced_folder "./dist", "/usr/share/cockpit/suricata", type: "sshfs", sshfs_opts_append: "-o cache=no"
  if config.vm.box.include?("fedora")
  config.vm.synced_folder "./.vagrantfiles/fedora/cache", "/var/cache/dnf", type: "sshfs"
  end
  if config.vm.box.include?("ubuntu")
    config.vm.synced_folder "./.vagrantfiles/ubuntu/cache", "/var/cache/apt", type: "sshfs", sshfs_opts_append: "-o nonempty"
  end


end

